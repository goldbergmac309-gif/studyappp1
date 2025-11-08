import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { extractLinkedNoteTitles, type TipTapJSON } from './notes.utils';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnedActiveSubject(userId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async listNotes(userId: string, subjectId: string) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    return this.prisma.note.findMany({
      where: { subjectId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        subjectId: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createNote(userId: string, subjectId: string, dto: CreateNoteDto) {
    await this.assertOwnedActiveSubject(userId, subjectId);

    const defaultDoc = { type: 'doc', content: [] } as const;

    return this.prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          title: dto.title,
          content: (dto.content ?? defaultDoc) as Prisma.InputJsonValue,
          subject: { connect: { id: subjectId } },
          versions: {
            create: {
              title: dto.title,
              content: (dto.content ?? defaultDoc) as Prisma.InputJsonValue,
            },
          },
        },
        select: {
          id: true,
          subjectId: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Compute and persist outgoing links based on content
      const contentForExtract = (dto.content ??
        defaultDoc) as unknown as TipTapJSON;
      const titles = extractLinkedNoteTitles(contentForExtract);
      if (titles.length > 0) {
        const targets = await tx.note.findMany({
          where: {
            title: { in: titles },
            subject: { userId },
          },
          select: { id: true },
        });
        if (targets.length > 0) {
          await tx.noteLink.deleteMany({ where: { fromNoteId: note.id } });
          await tx.noteLink.createMany({
            data: targets
              .filter((t) => t.id !== note.id)
              .map((t) => ({ fromNoteId: note.id, toNoteId: t.id })),
            skipDuplicates: true,
          });
        }
      }

      return note;
    });
  }

  async getNote(userId: string, subjectId: string, noteId: string) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, subjectId },
      select: {
        id: true,
        subjectId: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async updateNote(
    userId: string,
    subjectId: string,
    noteId: string,
    dto: UpdateNoteDto,
  ) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const defaultDoc = { type: 'doc', content: [] } as const;

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.note.findFirst({
        where: { id: noteId, subjectId },
        select: { id: true, title: true },
      });
      if (!exists) throw new NotFoundException('Note not found');

      const data: Prisma.NoteUpdateInput = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.content !== undefined)
        data.content = dto.content as Prisma.InputJsonValue;
      if (Object.keys(data).length === 0)
        throw new BadRequestException('No fields to update');

      // Load previous content if we need it for versioning
      const previousContent: Prisma.InputJsonValue =
        dto.content !== undefined
          ? (dto.content as Prisma.InputJsonValue)
          : ((await tx.note.findUnique({
              where: { id: noteId },
              select: { content: true },
            }))!.content as unknown as Prisma.InputJsonValue);

      const updated = await tx.note.update({
        where: { id: noteId },
        data: {
          ...data,
          versions:
            dto.content !== undefined || dto.title !== undefined
              ? {
                  create: {
                    title: dto.title ?? exists.title,
                    content: previousContent,
                  },
                }
              : undefined,
        },
        select: {
          id: true,
          subjectId: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Recompute and persist outgoing links from updated content
      const updatedContentForExtract = (updated.content ??
        defaultDoc) as unknown as TipTapJSON;
      const titles = extractLinkedNoteTitles(updatedContentForExtract);
      if (titles.length > 0) {
        const targets = await tx.note.findMany({
          where: {
            title: { in: titles },
            subject: { userId },
          },
          select: { id: true },
        });
        await tx.noteLink.deleteMany({ where: { fromNoteId: updated.id } });
        if (targets.length > 0) {
          await tx.noteLink.createMany({
            data: targets
              .filter((t) => t.id !== updated.id)
              .map((t) => ({ fromNoteId: updated.id, toNoteId: t.id })),
            skipDuplicates: true,
          });
        }
      } else {
        await tx.noteLink.deleteMany({ where: { fromNoteId: updated.id } });
      }

      return updated;
    });
  }

  async deleteNote(userId: string, subjectId: string, noteId: string) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const exists = await this.prisma.note.findFirst({
      where: { id: noteId, subjectId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Note not found');
    await this.prisma.note.delete({ where: { id: noteId } });
  }

  // Indexed backlinks lookup using NoteLink
  async findBacklinks(userId: string, subjectId: string, noteId: string) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, subjectId },
      select: { id: true },
    });
    if (!note) throw new NotFoundException('Note not found');

    const links = await this.prisma.noteLink.findMany({
      where: { toNoteId: noteId, fromNote: { subject: { userId } } },
      include: { fromNote: true },
    });
    return links.map((l) => ({
      id: l.fromNote.id,
      subjectId: l.fromNote.subjectId,
      title: l.fromNote.title,
      updatedAt: l.fromNote.updatedAt,
    }));
  }

  // Build a user (or subject)-scoped notes graph from precomputed edges
  async buildUserNotesGraph(userId: string, subjectId?: string) {
    const whereNode = subjectId
      ? { subjectId, subject: { userId } }
      : { subject: { userId } };

    const [nodes, edges] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where: whereNode,
        select: { id: true, subjectId: true, title: true },
      }),
      this.prisma.noteLink.findMany({
        where: subjectId
          ? { fromNote: { subjectId, subject: { userId } } }
          : { fromNote: { subject: { userId } } },
        select: { fromNoteId: true, toNoteId: true },
      }),
    ]);

    return {
      nodes,
      edges: edges.map((e) => ({ from: e.fromNoteId, to: e.toNoteId })),
    };
  }
}
