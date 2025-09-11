import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  NotFoundException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

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
  findAll(@Request() req: AuthRequest) {
    return this.subjectsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const subject = await this.subjectsService.findOneForUser(id, req.user.id);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }
}
