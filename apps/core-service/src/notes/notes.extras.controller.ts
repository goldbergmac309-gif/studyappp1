import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';

interface AuthRequest extends ExpressRequest {
  user: { id: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/notes/:noteId')
export class NotesExtrasController {
  constructor(private readonly notes: NotesService) {}

  @Get('backlinks')
  async backlinks(
    @Param('subjectId') subjectId: string,
    @Param('noteId') noteId: string,
    @Request() req: AuthRequest,
  ) {
    return {
      backlinks: await this.notes.findBacklinks(req.user.id, subjectId, noteId),
    };
  }
}
