import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';

interface AuthRequest extends ExpressRequest {
  user: { id: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesGraphController {
  constructor(private readonly notes: NotesService) {}

  @Get('graph')
  async graph(
    @Query('subjectId') subjectId: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.notes.buildUserNotesGraph(req.user.id, subjectId);
  }
}
