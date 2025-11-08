import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { SearchDto } from './dto/search.dto';

@Injectable()
export class SubjectsSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embed: EmbeddingService,
    private readonly config: ConfigService,
  ) {}

  async searchSubjectChunks(
    userId: string,
    subjectId: string,
    dto: SearchDto,
  ): Promise<{
    results: Array<{
      documentId: string;
      documentFilename: string;
      chunkIndex: number;
      snippet: string;
      score: number;
      createdAt?: string;
      updatedAt?: string;
    }>;
    nextCursor: string | null;
    tookMs: number;
  }> {
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
    const maxOffset = this.config.get<number>('app.search.maxOffset') ?? 10_000;
    const offset = Math.min(Math.max(dto.offset ?? 0, 0), maxOffset);
    // Interpret threshold as cosine similarity and convert to cosine distance
    const threshold = dto.threshold ?? 0.25; // cosine similarity
    const sim = Math.min(Math.max(threshold, 0), 1);
    const maxDist = 1 - sim;

    // Get query embedding
    const e = await this.embed.embedText(q);
    const dim = this.config.get<number>('app.engine.dimension') ?? 1536;
    if (!Array.isArray(e.embedding) || e.embedding.length !== dim) {
      throw new BadRequestException('Invalid query embedding dimension');
    }
    // Build a vector literal; pass as parameter and cast to vector in the query to avoid SQL injection
    const vectorLiteral = `[${e.embedding.join(',')}]`;

    // Execute pgvector similarity with parameterized vector cast
    const start = Date.now();
    let rows: Array<{
      documentId: string;
      documentFilename: string;
      chunkIndex: number;
      snippet: string;
      score: number;
      createdAt?: Date;
      updatedAt?: Date;
    }> = [];
    if (dto.threshold === undefined) {
      rows = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
          createdAt?: Date;
          updatedAt?: Date;
        }>
      >`
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               1 - (e."embedding" <=> (${vectorLiteral})::vector) AS "score",
               c."createdAt" AS "createdAt",
               c."updatedAt" AS "updatedAt"
        FROM "Embedding" e
        JOIN "DocumentChunk" c ON e."chunkId" = c."id"
        JOIN "Document" d ON c."documentId" = d."id"
        WHERE d."subjectId" = ${subjectId}
        ORDER BY e."embedding" <=> (${vectorLiteral})::vector ASC
        LIMIT ${k} OFFSET ${offset}
      `;
    } else {
      rows = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
          createdAt?: Date;
          updatedAt?: Date;
        }>
      >`
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               1 - (e."embedding" <=> (${vectorLiteral})::vector) AS "score",
               c."createdAt" AS "createdAt",
               c."updatedAt" AS "updatedAt"
        FROM "Embedding" e
        JOIN "DocumentChunk" c ON e."chunkId" = c."id"
        JOIN "Document" d ON c."documentId" = d."id"
        WHERE d."subjectId" = ${subjectId}
          AND (e."embedding" <=> (${vectorLiteral})::vector) <= ${maxDist}
        ORDER BY e."embedding" <=> (${vectorLiteral})::vector ASC
        LIMIT ${k} OFFSET ${offset}
      `;
    }

    // Fallback: if vector search returns no rows (e.g., extension issues or extreme distances),
    // return first chunks for this subject with a neutral score to avoid a dead-end UX.
    if (!rows || rows.length === 0) {
      rows = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          documentFilename: string;
          chunkIndex: number;
          snippet: string;
          score: number;
          createdAt?: Date;
          updatedAt?: Date;
        }>
      >`
        SELECT d."id" AS "documentId",
               d."filename" AS "documentFilename",
               c."index" AS "chunkIndex",
               c."text" AS "snippet",
               0::float AS "score",
               c."createdAt" AS "createdAt",
               c."updatedAt" AS "updatedAt"
        FROM "Document" d
        JOIN "DocumentChunk" c ON c."documentId" = d."id"
        WHERE d."subjectId" = ${subjectId}
        ORDER BY c."index" ASC
        LIMIT ${k} OFFSET ${offset}
      `;
    }

    const tookMs = Date.now() - start;
    const results = rows.map((r) => ({
      documentId: r.documentId,
      documentFilename: r.documentFilename,
      chunkIndex: r.chunkIndex,
      snippet: r.snippet,
      score: r.score,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));
    return { results, nextCursor: null, tookMs } as const;
  }
}
