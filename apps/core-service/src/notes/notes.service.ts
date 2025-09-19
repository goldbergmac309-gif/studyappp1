import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

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
      select: { id: true, subjectId: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
  }

  async createNote(userId: string, subjectId: string, dto: CreateNoteDto) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const data: Prisma.NoteCreateInput = {
      title: dto.title,
      content: (dto.content ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,
      subject: { connect: { id: subjectId } },
      versions: {
        create: {
          title: dto.title,
          content: (dto.content ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,
        },
      },
    };
    return this.prisma.note.create({
      data,
      select: { id: true, subjectId: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
  }

  async getNote(userId: string, subjectId: string, noteId: string) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, subjectId },
      select: { id: true, subjectId: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async updateNote(userId: string, subjectId: string, noteId: string, dto: UpdateNoteDto) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const exists = await this.prisma.note.findFirst({ where: { id: noteId, subjectId }, select: { id: true, title: true } });
    if (!exists) throw new NotFoundException('Note not found');

    const data: Prisma.NoteUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content as Prisma.InputJsonValue;
    if (Object.keys(data).length === 0) throw new BadRequestException('No fields to update');

    return this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...data,
        versions: dto.content !== undefined || dto.title !== undefined ? {
          create: {
            title: dto.title ?? exists.title,
            content: (dto.content ?? (await this.prisma.note.findUnique({ where: { id: noteId }, select: { content: true } }))!.content) as Prisma.InputJsonValue,
          },
        } : undefined,
      },
      select: { id: true, subjectId: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
  }

  async deleteNote(userId: string, subjectId: string, noteId: string) {
    await this.assertOwnedActiveSubject(userId, subjectId);
    const exists = await this.prisma.note.findFirst({ where: { id: noteId, subjectId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Note not found');
    await this.prisma.note.delete({ where: { id: noteId } });
  }
}
