import { PrismaClient } from '@prisma/client';
import { extractLinkedNoteTitles, type TipTapJSON } from '../src/notes/notes.utils';

const prisma = new PrismaClient();

function nowMs() {
  const t = process.hrtime.bigint();
  return Number(t / 1_000_000n);
}

async function seed(userEmail = 'bench@test.com') {
  // Create user + subject
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    create: { email: userEmail, password: 'irrelevant' },
    update: {},
  });
  const subject = await prisma.subject.create({
    data: { name: 'Benchmark Subject', userId: user.id },
  });

  const NOTE_COUNT = 5000;
  const EDGE_COUNT = 10000;

  // Create notes
  const notesData = Array.from({ length: NOTE_COUNT }).map((_, i) => ({
    title: `Note ${i + 1}`,
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: `Seeded note ${i + 1}` }] },
      ],
    },
    subjectId: subject.id,
  }));

  // Insert notes in chunks
  const CHUNK = 500;
  for (let i = 0; i < notesData.length; i += CHUNK) {
    const chunk = notesData.slice(i, i + CHUNK);
    await prisma.note.createMany({ data: chunk });
  }

  const notes = await prisma.note.findMany({
    where: { subjectId: subject.id },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const titleToId = new Map<string, string>();
  for (const n of notes) titleToId.set(n.title, n.id);

  // Create synthetic links (embed into content using wikilink representation)
  let edgesCreated = 0;
  for (let i = 0; i < notes.length && edgesCreated < EDGE_COUNT; i++) {
    const from = notes[i];
    const toA = notes[(i + 1) % notes.length];
    const toB = notes[(i + 137) % notes.length];
    const targets = [toA, toB];

    const content: TipTapJSON = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Links:' }] },
        { type: 'wikilink', attrs: { title: toA.title } },
        { type: 'paragraph', content: [{
          type: 'text', text: `More`, marks: [{ type: 'wikilink', attrs: { title: toB.title } }]
        }]},
      ],
    };

    await prisma.note.update({ where: { id: from.id }, data: { content } });
    edgesCreated += 2;
  }

  return { userId: user.id, subjectId: subject.id };
}

async function backfillForUser(userId: string) {
  const notes = await prisma.note.findMany({
    where: { subject: { userId } },
    select: { id: true, title: true, content: true },
  });
  const titleMap = new Map<string, string[]>();
  for (const n of notes) {
    const k = n.title.trim().toLowerCase();
    const arr = titleMap.get(k) ?? [];
    arr.push(n.id);
    titleMap.set(k, arr);
  }
  const edges: Array<{ fromNoteId: string; toNoteId: string }> = [];
  for (const n of notes) {
    const titles = extractLinkedNoteTitles(n.content as unknown as TipTapJSON);
    const uniq = new Set<string>(titles.map((t) => t.toLowerCase()));
    for (const t of uniq) {
      const ids = titleMap.get(t);
      if (!ids) continue;
      for (const toId of ids) {
        if (toId === n.id) continue;
        edges.push({ fromNoteId: n.id, toNoteId: toId });
      }
    }
  }
  const CHUNK = 1000;
  await prisma.noteLink.deleteMany({ where: { fromNote: { subject: { userId } } } });
  for (let i = 0; i < edges.length; i += CHUNK) {
    await prisma.noteLink.createMany({ data: edges.slice(i, i + CHUNK), skipDuplicates: true });
  }
}

async function beforeImpl(userId: string, subjectId?: string) {
  // Naive: scan notes, parse content, resolve titles via in-memory map
  const notes = await prisma.note.findMany({
    where: subjectId ? { subjectId, subject: { userId } } : { subject: { userId } },
    select: { id: true, subjectId: true, title: true, content: true },
  });
  const titleMap = new Map<string, string[]>();
  for (const n of notes) {
    const key = n.title.trim().toLowerCase();
    const v = titleMap.get(key) ?? [];
    v.push(n.id);
    titleMap.set(key, v);
  }

  const nodes = notes.map((n) => ({ id: n.id, subjectId: n.subjectId, title: n.title }));
  const edges: Array<{ from: string; to: string }> = [];

  for (const n of notes) {
    const titles = extractLinkedNoteTitles(n.content as unknown as TipTapJSON);
    for (const t of titles) {
      const targetIds = titleMap.get(t.toLowerCase());
      if (!targetIds) continue;
      for (const toId of targetIds) {
        if (toId === n.id) continue;
        edges.push({ from: n.id, to: toId });
      }
    }
  }

  return { nodes, edges };
}

async function afterImpl(userId: string, subjectId?: string) {
  const [nodes, edges] = await prisma.$transaction([
    prisma.note.findMany({
      where: subjectId ? { subjectId, subject: { userId } } : { subject: { userId } },
      select: { id: true, subjectId: true, title: true },
    }),
    prisma.noteLink.findMany({
      where: subjectId
        ? { fromNote: { subjectId, subject: { userId } } }
        : { fromNote: { subject: { userId } } },
      select: { fromNoteId: true, toNoteId: true },
    }),
  ]);
  return { nodes, edges: edges.map((e) => ({ from: e.fromNoteId, to: e.toNoteId })) };
}

async function benchmark() {
  const userEmail = process.env.BENCH_EMAIL || 'bench@test.com';
  if (process.env.SEED === '1') {
    console.log('Seeding dataset...');
    const { userId } = await seed(userEmail);
    await backfillForUser(userId);
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });

  const warm = 1;
  for (let i = 0; i < warm; i++) {
    await beforeImpl(user.id);
    await afterImpl(user.id);
  }

  console.log('Running timed benchmark...');
  const t1 = nowMs();
  await beforeImpl(user.id);
  const t2 = nowMs();
  await afterImpl(user.id);
  const t3 = nowMs();

  const beforeMs = t2 - t1;
  const afterMs = t3 - t2;
  const speedup = beforeMs / Math.max(1, afterMs);

  console.log(
    JSON.stringify(
      {
        beforeMs,
        afterMs,
        speedup,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

benchmark()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
