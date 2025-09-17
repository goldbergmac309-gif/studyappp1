import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { InternalService } from './internal.service';
import { UpsertReindexDto } from './dto/upsert-reindex.dto';
import { UpsertTopicsDto } from './dto/upsert-topics.dto';

@UseGuards(InternalApiKeyGuard)
@Controller('internal')
export class InternalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly internal: InternalService,
  ) {}

  @Put('documents/:documentId/analysis')
  async updateAnalysis(
    @Param('documentId') documentId: string,
    @Body() body: UpdateAnalysisDto,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Upsert analysis result for this document
    await this.prisma.analysisResult.upsert({
      where: { documentId },
      update: {
        engineVersion: body.engineVersion,
        resultPayload: body.resultPayload as object,
      },
      create: {
        documentId,
        engineVersion: body.engineVersion,
        resultPayload: body.resultPayload as object,
      },
    });

    // Mark document as completed
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    return { status: 'ok', documentId };
  }

  @Get('subjects/:subjectId/documents')
  async listSubjectDocuments(@Param('subjectId') subjectId: string) {
    return this.internal.listSubjectDocuments(subjectId);
  }

  @Get('subjects/:subjectId/chunks')
  async listSubjectChunks(@Param('subjectId') subjectId: string) {
    return await this.internal.listSubjectChunks(subjectId);
  }

  @Put('reindex/:subjectId/chunks')
  async upsertReindex(
    @Param('subjectId') subjectId: string,
    @Body() body: UpsertReindexDto,
  ) {
    return await this.internal.upsertChunksAndEmbeddings(subjectId, body);
  }

  @Put('subjects/:subjectId/topics')
  async upsertTopics(
    @Param('subjectId') subjectId: string,
    @Body() body: UpsertTopicsDto,
  ) {
    return await this.internal.upsertSubjectTopics(subjectId, body);
  }
}
