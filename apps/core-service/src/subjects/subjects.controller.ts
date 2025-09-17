import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  NotFoundException,
  Patch,
  Delete,
  HttpCode,
  Query,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SearchDto } from './dto/search.dto';

type AuthRequest = ExpressRequest & { user: { id: string; email: string } };

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  create(
    @Body() createSubjectDto: CreateSubjectDto,
    @Request() req: AuthRequest,
  ) {
    return this.subjectsService.create(createSubjectDto, req.user.id);
  }

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query('filter') filter?: 'recent' | 'all' | 'starred' | 'archived',
  ) {
    return this.subjectsService.findAllByUser(req.user.id, filter ?? 'recent');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const subject = await this.subjectsService.findOneForUser(id, req.user.id);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @Request() req: AuthRequest,
  ) {
    return this.subjectsService.updateSubject(
      req.user.id,
      id,
      updateSubjectDto,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async archive(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.subjectsService.archiveSubject(req.user.id, id);
  }

  @Post(':id/unarchive')
  @HttpCode(204)
  async unarchive(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.subjectsService.unarchiveSubject(req.user.id, id);
  }

  @Post(':id/reindex')
  @HttpCode(202)
  async reindex(@Param('id') id: string, @Request() req: AuthRequest) {
    return await this.subjectsService.reindexSubject(req.user.id, id);
  }

  @Get(':id/search')
  async search(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Query() query: SearchDto,
  ) {
    return await this.subjectsService.searchSubjectChunks(
      req.user.id,
      id,
      query,
    );
  }

  @Get(':id/topics')
  async getTopics(@Param('id') id: string, @Request() req: AuthRequest) {
    return await this.subjectsService.getSubjectTopics(req.user.id, id);
  }
}
