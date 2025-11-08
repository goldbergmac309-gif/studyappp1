import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Subject, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  private subjectBaseSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    lastAccessedAt: true,
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
    page = 1,
    pageSize = 50,
  ): Promise<Subject[]> {
    const where: Prisma.SubjectWhereInput = { userId };
    if (filter === 'archived') {
      where.archivedAt = { not: null };
    } else {
      // recent, all, starred -> only non-archived
      where.archivedAt = null;
      if (filter === 'starred') where.starred = true;
      if (filter === 'recent') {
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        // Consider items accessed or created within the window
        where.OR = [
          { lastAccessedAt: { gte: cutoff } },
          { AND: [{ lastAccessedAt: null }, { createdAt: { gte: cutoff } }] },
        ];
      }
    }

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = Math.max((Math.max(page, 1) - 1) * take, 0);
    const orderBy =
      filter === 'recent'
        ? [{ lastAccessedAt: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    return this.prisma.subject.findMany({
      where,
      orderBy,
      select: this.subjectBaseSelect,
      skip,
      take,
    });
  }

  async findOneForUser(id: string, userId: string): Promise<Subject | null> {
    const exists = await this.prisma.subject.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const updated = await this.prisma.subject.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
      select: this.subjectBaseSelect,
    });
    return updated;
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

  async reindexSubject(
    userId: string,
    subjectId: string,
  ): Promise<{ status: 'queued' }> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    // Publish idempotent reindex job
    this.queue.publishReindexJob({ subjectId });
    return { status: 'queued' } as const;
  }
}
