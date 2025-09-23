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

  // Simple in-memory rate limiter per user for search endpoint
  // windowMs: 10s, maxRequests: 30
  private readonly searchRate: Map<
    string,
    { count: number; windowStart: number }
  > = new Map();
  private readonly RATE_WINDOW_MS = 10_000;
  private readonly RATE_MAX = 30;

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

    // Rate limit per-user
    const now = Date.now();
    const rl = this.searchRate.get(userId);
    if (!rl || now - rl.windowStart > this.RATE_WINDOW_MS) {
      this.searchRate.set(userId, { count: 1, windowStart: now });
    } else {
      rl.count += 1;
      if (rl.count > this.RATE_MAX) {
        throw new BadRequestException('Rate limit exceeded');
      }
    }

    const q = (dto.query || '').trim();
    if (q.length < 2)
      throw new BadRequestException('query must be at least 2 characters');
    const k = Math.min(Math.max(dto.k ?? 20, 1), 100);
    const offset = Math.min(Math.max(dto.offset ?? 0, 0), 10_000);
    // Interpret threshold as cosine similarity and convert to cosine distance
    // In pgvector, <=> is cosine distance: d = 1 - cosine_similarity in [0,2]
    // We bound similarity to [0,1] (ignore negative similarities in filtering)
    const threshold = dto.threshold ?? 0.25; // cosine similarity
    const sim = Math.min(Math.max(threshold, 0), 1);
    const maxDist = 1 - sim;

    // Get query embedding
    const e = await this.embed.embedText(q);
    if (!Array.isArray(e.embedding) || e.embedding.length !== 1536) {
      throw new BadRequestException('Invalid query embedding dimension');
    }
    // Build a vector literal inline to avoid parameterized cast issues in pgvector
    const vectorLiteral = `[${e.embedding.join(',')}]`;

    // Execute pgvector similarity with parameterized vector cast
    let rows: Array<{
      documentId: string;
      documentFilename: string;
      chunkIndex: number;
      snippet: string;
      score: number;
    }> = [];
    if (dto.threshold === undefined) {
      const sql = `
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               1 - (e."embedding" <=> ('${vectorLiteral}')::vector) AS "score"
        FROM "Embedding" e
        JOIN "DocumentChunk" c ON e."chunkId" = c."id"
        JOIN "Document" d ON c."documentId" = d."id"
        WHERE d."subjectId" = '${subjectId}'
        ORDER BY e."embedding" <=> ('${vectorLiteral}')::vector ASC
        LIMIT ${k} OFFSET ${offset}
      `;
      rows = await this.prisma.$queryRawUnsafe<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
        }>
      >(sql);
    } else {
      const sql = `
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               1 - (e."embedding" <=> ('${vectorLiteral}')::vector) AS "score"
        FROM "Embedding" e
        JOIN "DocumentChunk" c ON e."chunkId" = c."id"
        JOIN "Document" d ON c."documentId" = d."id"
        WHERE d."subjectId" = '${subjectId}'
          AND (e."embedding" <=> ('${vectorLiteral}')::vector) <= ${maxDist}
        ORDER BY e."embedding" <=> ('${vectorLiteral}')::vector ASC
        LIMIT ${k} OFFSET ${offset}
      `;
      rows = await this.prisma.$queryRawUnsafe<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
        }>
      >(sql);
    }

    // Fallback: if vector search returns no rows (e.g., extension issues or extreme distances),
    // return first chunks for this subject with a neutral score to avoid a dead-end UX.
    if (!rows || rows.length === 0) {
      const fallbackSql = `
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               0::float AS "score"
        FROM "Document" d
        JOIN "DocumentChunk" c ON c."documentId" = d."id"
        WHERE d."subjectId" = '${subjectId}'
        ORDER BY c."index" ASC
        LIMIT ${k} OFFSET ${offset}
      `;
      rows = await this.prisma.$queryRawUnsafe<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
        }>
      >(fallbackSql);
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
