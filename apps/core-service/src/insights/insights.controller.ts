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
import { InsightsService, InsightSessionView } from './insights.service';

type AuthRequest = ExpressRequest & { user: { id: string; email: string } };

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
    return await this.insights.createSession(req.user.id, subjectId, body);
  }

  @Get('insight-sessions/:sessionId')
  async getOne(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
  ): Promise<InsightSessionView> {
    return await this.insights.getSession(req.user.id, sessionId);
  }

  @Sse('insight-sessions/:sessionId/stream')
  stream(@Param('sessionId') sessionId: string, @Request() req: AuthRequest) {
    const userId = req.user.id;
    return this.insights.streamSession(userId, sessionId);
  }
}
