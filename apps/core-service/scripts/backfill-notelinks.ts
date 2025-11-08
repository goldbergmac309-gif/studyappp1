import { PrismaClient } from '@prisma/client';
import { extractLinkedNoteTitles, type TipTapJSON } from '../src/notes/notes.utils';

const prisma = new PrismaClient();

async function backfillForUser(userId: string) {
  // Fetch all notes for user
  const notes = await prisma.note.findMany({
    where: { subject: { userId } },
    select: { id: true, title: true, content: true, subjectId: true },
  });

  const titleMap = new Map<string, string[]>(); // lower(title) -> noteIds[]
  for (const n of notes) {
    const key = n.title.trim().toLowerCase();
    const arr = titleMap.get(key) ?? [];
    arr.push(n.id);
    titleMap.set(key, arr);
  }

  const batch: Array<{ fromNoteId: string; toNoteId: string }> = [];

  for (const n of notes) {
    const titles = extractLinkedNoteTitles(n.content as unknown as TipTapJSON);
    const unique = new Set<string>(titles.map((t) => t.toLowerCase()));
    for (const t of unique) {
      const targetIds = titleMap.get(t);
      if (!targetIds) continue;
      for (const toId of targetIds) {
        if (toId === n.id) continue; // skip self-link
        batch.push({ fromNoteId: n.id, toNoteId: toId });
      }
    }
  }

  // Write in chunks
  const CHUNK = 1000;
  // Clean slate (idempotent, but we delete to avoid duplicates)
  await prisma.noteLink.deleteMany({
    where: { fromNote: { subject: { userId } } },
  });

  for (let i = 0; i < batch.length; i += CHUNK) {
    const slice = batch.slice(i, i + CHUNK);
    await prisma.noteLink.createMany({ data: slice, skipDuplicates: true });
  }
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    console.log(`[backfill] user=${u.id}`);
    await backfillForUser(u.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
