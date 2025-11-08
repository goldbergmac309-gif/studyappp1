import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GlobalSearchResponse } from '@studyapp/shared-types';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async performGlobalSearch(
    userId: string,
    dto: SearchQueryDto,
  ): Promise<GlobalSearchResponse> {
    const q = (dto.q || '').trim();
    const limit = Math.min(Math.max(dto.limit ?? 20, 1), 50);

    // Notes: title ILIKE or content ILIKE (content is JSON; cast to text)
    const like = `%${q}%`;

    const notesPromise = this.prisma.$queryRaw<
      Array<{ id: string; subjectId: string; title: string; updatedAt: Date }>
    >`
      SELECT n."id", n."subjectId", n."title", n."updatedAt"
      FROM "Note" n
      JOIN "Subject" s ON s."id" = n."subjectId"
      WHERE s."userId" = ${userId}
        AND (
          n."title" ILIKE ${like}
          OR n."content"::text ILIKE ${like}
        )
      ORDER BY n."updatedAt" DESC
      LIMIT ${limit}
    `;

    // Documents: filename contains (case-insensitive)
    const documentsPromise = this.prisma.document.findMany({
      where: {
        subject: { userId },
        filename: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, subjectId: true, filename: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const [notesRows, docs] = await Promise.all([
      notesPromise,
      documentsPromise,
    ]);

    const notes = (notesRows || []).map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      title: r.title,
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));

    const documents = (docs || []).map((d) => ({
      id: d.id,
      subjectId: d.subjectId,
      filename: d.filename,
      createdAt: new Date(d.createdAt).toISOString(),
    }));

    return { notes, documents };
  }
}
