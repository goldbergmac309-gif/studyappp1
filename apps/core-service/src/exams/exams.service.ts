import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { GenerateExamDto } from './dto/generate-exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async generateExam(userId: string, subjectId: string, dto: GenerateExamDto) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const numQuestions = Math.min(Math.max(dto.numQuestions ?? 10, 1), 100);

    const exam = await this.prisma.examPaper.create({
      data: {
        subjectId,
        status: 'PROCESSING',
        params: {
          numQuestions,
          difficulty: dto.difficulty ?? 'MEDIUM',
          includeCitations: dto.includeCitations ?? true,
          extra: dto.extra ?? {},
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    // Publish async job (graceful no-op when RMQ not configured)
    try {
      this.queue.publishExamJob({
        examId: exam.id,
        subjectId,
        params: {
          numQuestions,
          difficulty: dto.difficulty ?? 'MEDIUM',
          includeCitations: dto.includeCitations ?? true,
        },
      });
    } catch {
      // If channel not initialized, surface a clear error
      throw new BadRequestException('Exam queue unavailable');
    }

    return { examId: exam.id, status: 'queued' } as const;
  }

  async getExam(userId: string, examId: string) {
    const exam = await this.prisma.examPaper.findFirst({
      where: { id: examId, subject: { userId } },
      select: {
        id: true,
        subjectId: true,
        status: true,
        params: true,
        result: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }
}
