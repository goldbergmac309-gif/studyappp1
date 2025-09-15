import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Subject, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  private subjectBaseSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    courseCode: true,
    professorName: true,
    ambition: true,
    color: true,
    starred: true,
    archivedAt: true,
    userId: true,
    blueprintId: true,
    boardConfig: true,
  } as const;

  async create(
    createSubjectDto: CreateSubjectDto,
    userId: string,
  ): Promise<Subject> {
    return this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        userId,
      },
      select: this.subjectBaseSelect,
    });
  }

  async findAllByUser(
    userId: string,
    filter: 'recent' | 'all' | 'starred' | 'archived' = 'recent',
  ): Promise<Subject[]> {
    const where: Prisma.SubjectWhereInput = { userId };
    if (filter === 'archived') {
      where.archivedAt = { not: null };
    } else {
      // recent, all, starred -> only non-archived
      where.archivedAt = null;
      if (filter === 'starred') where.starred = true;
      if (filter === 'recent') {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: twoWeeksAgo };
      }
    }
    return this.prisma.subject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: this.subjectBaseSelect,
    });
  }

  async findOneForUser(id: string, userId: string): Promise<Subject | null> {
    return this.prisma.subject.findFirst({
      where: { id, userId, archivedAt: null },
      select: this.subjectBaseSelect,
    });
  }

  async updateSubject(
    userId: string,
    subjectId: string,
    dto: UpdateSubjectDto,
  ): Promise<Subject> {
    const exists = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Subject not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.courseCode !== undefined) data.courseCode = dto.courseCode;
    if (dto.professorName !== undefined) data.professorName = dto.professorName;
    if (dto.ambition !== undefined) data.ambition = dto.ambition;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.starred !== undefined) data.starred = dto.starred;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data,
      select: this.subjectBaseSelect,
    });
  }

  async archiveSubject(userId: string, subjectId: string): Promise<void> {
    const exists = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Subject not found');
    }

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { archivedAt: new Date() },
    });
  }

  async unarchiveSubject(userId: string, subjectId: string): Promise<void> {
    const exists = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true, archivedAt: true },
    });
    if (!exists) {
      throw new NotFoundException('Subject not found');
    }
    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { archivedAt: null },
    });
  }
}
