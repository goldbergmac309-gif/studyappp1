import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsTopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubjectTopics(
    userId: string,
    subjectId: string,
  ): Promise<{
    topics: Array<{
      label: string;
      weight: number;
      terms: Array<{ term: string; score: number }>;
      documentIds?: string[];
    }>;
    computedAt: string;
    version: string;
  }> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const row = await this.prisma.subjectTopics.findUnique({
      where: { subjectId },
      select: { topics: true, updatedAt: true, engineVersion: true },
    });
    if (!row) {
      throw new NotFoundException('Topics not found');
    }
    const topics = row.topics as unknown as Array<{
      label: string;
      weight: number;
      terms: Array<{ term: string; score: number }>;
      documentIds?: string[];
    }>;
    return {
      topics,
      computedAt: new Date(row.updatedAt).toISOString(),
      version: row.engineVersion,
    };
  }
}
