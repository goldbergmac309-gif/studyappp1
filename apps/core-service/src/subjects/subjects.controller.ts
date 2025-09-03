import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  create(@Body() createSubjectDto: CreateSubjectDto, @Request() req: any) {
    return this.subjectsService.create(createSubjectDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.subjectsService.findAllByUser(req.user.id);
  }
}
