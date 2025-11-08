import {
  BadRequestException,
  Injectable,
  NotFoundException,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateInsightSessionDto } from './dto/create-insight-session.dto';
import { InsightsEventsService } from './insights-events.service';

export type InsightSessionView = {
  id: string;
  subjectId: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  documentIds?: string[];
  result?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

type SessionRow = {
  id: string;
  subjectId: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  documentIds?: Prisma.JsonValue;
  result?: Prisma.JsonValue | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly events: InsightsEventsService,
  ) {}

  async createSession(
    userId: string,
    subjectId: string,
    dto: CreateInsightSessionDto,
  ): Promise<InsightSessionView> {
    if (!Array.isArray(dto.documentIds) || dto.documentIds.length === 0) {
      throw new BadRequestException('documentIds is required');
    }

    // Validate subject ownership
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const session = await this.prisma.insightSession.create({
      data: {
        subjectId,
        documentIds: dto.documentIds,
        status: 'PENDING',
      },
      select: {
        id: true,
        subjectId: true,
        status: true,
        documentIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      this.queue.publishInsightsSessionJob({
        subjectId,
        sessionId: session.id,
        documentIds: dto.documentIds,
      });
    } catch {
      // Non-fatal; session stays PENDING and can be retried
    }

    return this.formatSession(session);
  }

  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<InsightSessionView> {
    const session = await this.prisma.insightSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        subjectId: true,
        status: true,
        result: true,
        documentIds: true,
        createdAt: true,
        updatedAt: true,
        subject: { select: { userId: true } },
      },
    });
    if (!session || session.subject.userId !== userId) {
      throw new NotFoundException('Insight session not found');
    }
    // Build view sans subject
    const rest: SessionRow = {
      id: session.id,
      subjectId: session.subjectId,
      status: session.status,
      documentIds: session.documentIds,
      result: session.result,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
    return this.formatSession(rest);
  }

  streamSession(userId: string, sessionId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let active = true;
      const emitSnapshot = async () => {
        if (!active) return;
        try {
          const data = await this.getSession(userId, sessionId);
          subscriber.next({ data });
          if (data.status === 'READY' || data.status === 'FAILED') {
            active = false;
            cleanup();
            subscriber.complete();
          }
        } catch (err) {
          active = false;
          cleanup();
          subscriber.error(err);
        }
      };
      const streamSub = this.events.stream(sessionId).subscribe(() => {
        void emitSnapshot();
      });
      const cleanup = () => {
        streamSub.unsubscribe();
      };
      void emitSnapshot();
      return () => {
        active = false;
        cleanup();
      };
    });
  }

  private formatSession(session: SessionRow): InsightSessionView {
    const createdAt =
      typeof session.createdAt === 'string'
        ? session.createdAt
        : session.createdAt instanceof Date
          ? session.createdAt.toISOString()
          : undefined;
    const updatedAt =
      typeof session.updatedAt === 'string'
        ? session.updatedAt
        : session.updatedAt instanceof Date
          ? session.updatedAt.toISOString()
          : undefined;
    const idsRaw = session.documentIds;
    const documentIds: string[] = Array.isArray(idsRaw)
      ? idsRaw.filter((v): v is string => typeof v === 'string')
      : [];
    return {
      id: session.id,
      subjectId: session.subjectId,
      status: session.status,
      documentIds,
      result: (session.result as Record<string, unknown>) ?? null,
      createdAt,
      updatedAt,
    };
  }
}
