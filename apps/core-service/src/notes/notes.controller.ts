import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

interface AuthRequest extends ExpressRequest {
  user: { id: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@Param('subjectId') subjectId: string, @Request() req: AuthRequest) {
    return this.notes.listNotes(req.user.id, subjectId);
  }

  @Post()
  create(
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateNoteDto,
    @Request() req: AuthRequest,
  ) {
    return this.notes.createNote(req.user.id, subjectId, dto);
  }

  @Get(':noteId')
  getOne(
    @Param('subjectId') subjectId: string,
    @Param('noteId') noteId: string,
    @Request() req: AuthRequest,
  ) {
    return this.notes.getNote(req.user.id, subjectId, noteId);
  }

  @Patch(':noteId')
  update(
    @Param('subjectId') subjectId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
    @Request() req: AuthRequest,
  ) {
    return this.notes.updateNote(req.user.id, subjectId, noteId, dto);
  }

  @Delete(':noteId')
  @HttpCode(204)
  async remove(
    @Param('subjectId') subjectId: string,
    @Param('noteId') noteId: string,
    @Request() req: AuthRequest,
  ) {
    await this.notes.deleteNote(req.user.id, subjectId, noteId);
  }
}
