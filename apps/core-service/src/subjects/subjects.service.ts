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
import { SearchDto } from './dto/search.dto';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class SubjectsService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private embed: EmbeddingService,
  ) {}

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

  async searchSubjectChunks(
    userId: string,
    subjectId: string,
    dto: SearchDto,
  ): Promise<
    Array<{
      documentId: string;
      documentFilename: string;
      chunkIndex: number;
      snippet: string;
      score: number;
    }>
  > {
    // Ownership check
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const q = (dto.query || '').trim();
    if (q.length < 2)
      throw new BadRequestException('query must be at least 2 characters');
    const k = Math.min(Math.max(dto.k ?? 20, 1), 100);
    // Interpret threshold as cosine similarity and convert to cosine distance
    // In pgvector, <=> is cosine distance: d = 1 - cosine_similarity in [0,2]
    // We bound similarity to [0,1] (ignore negative similarities in filtering)
    const threshold = dto.threshold ?? 0.25; // cosine similarity
    const sim = Math.min(Math.max(threshold, 0), 1);
    const maxDist = 1 - sim;

    // Get query embedding
    const e = await this.embed.embedText(q);
    if (!Array.isArray(e.embedding) || e.embedding.length !== 384) {
      throw new BadRequestException('Invalid query embedding dimension');
    }
    const vectorString = `[${e.embedding.join(',')}]`;

    // Execute pgvector similarity with parameterized vector cast
    let rows: Array<{
      documentId: string;
      documentFilename: string;
      chunkIndex: number;
      snippet: string;
      score: number;
    }> = [];
    if (dto.threshold === undefined) {
      rows = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
        }>
      >`
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               1 - (e."embedding" <=> (CAST(${vectorString} AS text))::vector) AS "score"
        FROM "Embedding" e
        JOIN "DocumentChunk" c ON e."chunkId" = c."id"
        JOIN "Document" d ON c."documentId" = d."id"
        WHERE d."subjectId" = ${subjectId}
        ORDER BY e."embedding" <=> (CAST(${vectorString} AS text))::vector ASC
        LIMIT ${k}
      `;
    } else {
      rows = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
        }>
      >`
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               1 - (e."embedding" <=> (CAST(${vectorString} AS text))::vector) AS "score"
        FROM "Embedding" e
        JOIN "DocumentChunk" c ON e."chunkId" = c."id"
        JOIN "Document" d ON c."documentId" = d."id"
        WHERE d."subjectId" = ${subjectId}
          AND (e."embedding" <=> (CAST(${vectorString} AS text))::vector) <= ${maxDist}
        ORDER BY e."embedding" <=> (CAST(${vectorString} AS text))::vector ASC
        LIMIT ${k}
      `;
    }

    return rows;
  }

  async getSubjectTopics(
    userId: string,
    subjectId: string,
  ): Promise<
    Array<{
      label: string;
      weight: number;
      terms: Array<{ term: string; score: number }>;
      documentIds?: string[];
    }>
  > {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const topics = await this.prisma.subjectTopics.findUnique({
      where: { subjectId },
      select: { topics: true },
    });
    if (!topics) {
      throw new NotFoundException('Topics not found');
    }
    return topics.topics as unknown as Array<{
      label: string;
      weight: number;
      terms: Array<{ term: string; score: number }>;
      documentIds?: string[];
    }>;
  }
}
