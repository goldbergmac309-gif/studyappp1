import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertReindexDto } from './dto/upsert-reindex.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubjectDocuments(subjectId: string) {
    const subj = await this.prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subj) throw new NotFoundException('Subject not found');

    const docs = await this.prisma.document.findMany({
      where: { subjectId },
      select: { id: true, s3Key: true },
      orderBy: { createdAt: 'asc' },
    });
    return docs;
  }

  async upsertChunksAndEmbeddings(subjectId: string, dto: UpsertReindexDto) {
    // Validate document belongs to subject
    const doc = await this.prisma.document.findFirst({
      where: { id: dto.documentId, subjectId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('Document not found for subject');

    // Enforce pgvector column dimension (Embedding.embedding is vector(384))
    const EXPECTED_DIM = 384;
    if (dto.dim !== EXPECTED_DIM) {
      throw new BadRequestException(
        `Embedding dim must be ${EXPECTED_DIM}; received ${dto.dim}`,
      );
    }

    // Validate embedding dimensions per-chunk
    for (const c of dto.chunks) {
      if (!Array.isArray(c.embedding) || c.embedding.length !== dto.dim) {
        throw new BadRequestException(`Embedding dimension mismatch at index ${c.index}: expected ${dto.dim}, got ${c.embedding.length}`);
      }
      // Ensure all numbers are finite
      if (!c.embedding.every((v) => Number.isFinite(v))) {
        throw new BadRequestException(`Embedding contains non-finite numbers at index ${c.index}`);
      }
    }

    // Enrich payload with generated ids for new rows
    const payload = dto.chunks.map((c) => ({
      idx: c.index,
      text: c.text,
      tokens: Number.isFinite(c.tokens as any) ? (c.tokens as number) : null,
      embedding: c.embedding,
      newid: randomUUID(),
    }));

    // Execute in a single transaction using raw SQL + jsonb_to_recordset and pgvector cast
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`WITH data AS (
        SELECT *
        FROM jsonb_to_recordset(CAST(${JSON.stringify(payload)} AS jsonb)) AS
          t(idx int, text text, tokens int, embedding double precision[], newid text)
      ), upsert_chunks AS (
        INSERT INTO "DocumentChunk" ("id","documentId","index","text","tokens","createdAt","updatedAt")
        SELECT COALESCE(dc."id", d.newid) AS id,
               ${dto.documentId}::text AS documentId,
               d.idx AS index,
               d.text,
               d.tokens,
               NOW(), NOW()
        FROM data d
        LEFT JOIN "DocumentChunk" dc ON dc."documentId" = ${dto.documentId}::text AND dc."index" = d.idx
        ON CONFLICT ("documentId","index")
        DO UPDATE SET "text" = EXCLUDED."text",
                      "tokens" = EXCLUDED."tokens",
                      "updatedAt" = NOW()
        RETURNING "id","index"
      )
      INSERT INTO "Embedding" ("chunkId","model","dim","embedding","createdAt")
      SELECT c."id", ${dto.model}::text, ${dto.dim}::int,
             ('[' || array_to_string(d.embedding, ',') || ']')::vector,
             NOW()
      FROM data d
      JOIN "DocumentChunk" c ON c."documentId" = ${dto.documentId}::text AND c."index" = d.idx
      ON CONFLICT ("chunkId")
      DO UPDATE SET "model" = EXCLUDED."model",
                    "dim" = EXCLUDED."dim",
                    "embedding" = EXCLUDED."embedding";`;
    });

    return { upsertedChunks: dto.chunks.length, upsertedEmbeddings: dto.chunks.length };
  }
}
