import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'
import { CreateInsightSessionDto } from './dto/create-insight-session.dto'

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async createSession(
    userId: string,
    subjectId: string,
    dto: CreateInsightSessionDto,
  ) {
    if (!Array.isArray(dto.documentIds) || dto.documentIds.length === 0) {
      throw new BadRequestException('documentIds is required')
    }

    // Validate subject ownership
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    })
    if (!subject) throw new NotFoundException('Subject not found')

    // Create session (use any-cast to support schema addition before prisma generate in CI)
    const prismaAny = this.prisma as any
    const session = await prismaAny.insightSession.create({
      data: {
        subjectId,
        documentIds: dto.documentIds as any,
        status: 'PENDING',
      },
      select: { id: true, subjectId: true, status: true, documentIds: true, createdAt: true, updatedAt: true },
    })

    try {
      this.queue.publishInsightsSessionJob({
        subjectId,
        sessionId: session.id as string,
        documentIds: dto.documentIds,
      })
    } catch {
      // Non-fatal; session stays PENDING and can be retried
    }

    return session
  }

  async getSession(userId: string, sessionId: string) {
    const prismaAny = this.prisma as any
    const session = await prismaAny.insightSession.findUnique({
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
    })
    if (!session || session.subject.userId !== userId) {
      throw new NotFoundException('Insight session not found')
    }
    // Remove nested subject object from response
    const { subject, ...rest } = session
    return rest
  }
}
