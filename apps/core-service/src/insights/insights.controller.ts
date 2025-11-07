import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInsightSessionDto } from './dto/create-insight-session.dto';
import { InsightsService } from './insights.service';
import { Observable } from 'rxjs';

type AuthRequest = ExpressRequest & { user: { id: string; email: string } };

type InsightSessionView = {
  id: string;
  subjectId: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  documentIds?: string[];
  result?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

@UseGuards(JwtAuthGuard)
@Controller()
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Post('subjects/:subjectId/insight-sessions')
  async create(
    @Param('subjectId') subjectId: string,
    @Body() body: CreateInsightSessionDto,
    @Request() req: AuthRequest,
  ) {
    return (await this.insights.createSession(
      req.user.id,
      subjectId,
      body,
    )) as InsightSessionView;
  }

  @Get('insight-sessions/:sessionId')
  async getOne(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
  ): Promise<InsightSessionView> {
    return (await this.insights.getSession(
      req.user.id,
      sessionId,
    )) as InsightSessionView;
  }

  @Sse('insight-sessions/:sessionId/stream')
  stream(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
  ): Observable<MessageEvent> {
    const userId = req.user.id;
    return new Observable<MessageEvent>((subscriber) => {
      let active = true;
      const tick = async () => {
        if (!active) return;
        try {
          const cur = (await this.insights.getSession(
            userId,
            sessionId,
          )) as InsightSessionView;
          subscriber.next({ data: cur });
          if (cur.status === 'READY' || cur.status === 'FAILED') {
            active = false;
            subscriber.complete();
          }
        } catch (e) {
          active = false;
          subscriber.error(e);
        }
      };
      const id = setInterval(() => {
        void tick();
      }, 1000);
      void tick();
      return () => {
        active = false;
        clearInterval(id);
      };
    });
  }
}
