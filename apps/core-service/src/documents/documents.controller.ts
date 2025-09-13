import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Req,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

type RequestWithUser = Request & { user: { id: string; email: string } };

@Controller('subjects/:subjectId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: RequestWithUser,
    @Param('subjectId') subjectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.id;
    const result = await this.documentsService.upload(userId, subjectId, file);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Param('subjectId') subjectId: string,
  ) {
    const userId = req.user.id;
    return this.documentsService.listForSubject(userId, subjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reprocess')
  @HttpCode(200)
  async reprocess(
    @Req() req: RequestWithUser,
    @Param('subjectId') subjectId: string,
    @Param('id') documentId: string,
  ) {
    const userId = req.user.id;
    return this.documentsService.reprocess(userId, subjectId, documentId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsQueryController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id/analysis')
  async getAnalysis(
    @Req() req: RequestWithUser,
    @Param('id') documentId: string,
  ) {
    const userId = req.user.id;
    return this.documentsService.getAnalysis(userId, documentId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/insights')
export class SubjectInsightsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async listInsights(
    @Req() req: RequestWithUser,
    @Param('subjectId') subjectId: string,
  ) {
    const userId = req.user.id;
    return this.documentsService.listSubjectInsights(userId, subjectId);
  }
}
