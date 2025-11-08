import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { UpdateInsightSessionDto } from './dto/update-insight-session.dto';
import { UpdateMetaDto } from './dto/update-meta.dto';
import { HmacGuard } from './guards/hmac.guard';
import { InternalService } from './internal.service';
import { UpsertReindexDto } from './dto/upsert-reindex.dto';
import { UpsertTopicsDto } from './dto/upsert-topics.dto';
import { UpsertStructureDto } from './dto/upsert-structure.dto';
import { UpsertQuestionsDto } from './dto/upsert-questions.dto';
import { UpsertConceptGraphDto } from './dto/upsert-concept-graph.dto';
import { UpsertInsightVersionDto } from './dto/upsert-insight-version.dto';
import { RecordSubjectHistoryDto } from './dto/record-subject-history.dto';
import { UpsertExamTemplateDto } from './dto/upsert-exam-template.dto';

@UseGuards(HmacGuard)
@Controller('internal')
export class InternalController {
  constructor(private readonly internal: InternalService) {}

  @Put('documents/:documentId/analysis')
  async updateAnalysis(
    @Param('documentId') documentId: string,
    @Body() body: UpdateAnalysisDto,
  ) {
    // Delegate to service to maintain layering and testability
    return this.internal.updateAnalysis(documentId, body);
  }

  @Put('documents/:documentId/meta')
  async updateMeta(
    @Param('documentId') documentId: string,
    @Body() body: UpdateMetaDto,
  ) {
    return await this.internal.updateMeta(documentId, body);
  }

  @Put('documents/:documentId/structure')
  async upsertStructure(
    @Param('documentId') documentId: string,
    @Body() body: UpsertStructureDto,
  ) {
    return await this.internal.upsertDocumentStructure(documentId, body);
  }

  @Put('documents/:documentId/questions')
  async upsertQuestions(
    @Param('documentId') documentId: string,
    @Body() body: UpsertQuestionsDto,
  ) {
    return await this.internal.upsertDocumentQuestions(documentId, body);
  }

  @Get('documents/:documentId/context')
  async getDocumentContext(@Param('documentId') documentId: string) {
    return await this.internal.getDocumentContext(documentId);
  }

  @Get('subjects/:subjectId/documents')
  async listSubjectDocuments(@Param('subjectId') subjectId: string) {
    return this.internal.listSubjectDocuments(subjectId);
  }

  @Get('subjects/:subjectId/chunks')
  async listSubjectChunks(@Param('subjectId') subjectId: string) {
    return await this.internal.listSubjectChunks(subjectId);
  }

  @Get('subjects/:subjectId/questions')
  async listSubjectQuestions(@Param('subjectId') subjectId: string) {
    return await this.internal.listSubjectQuestions(subjectId);
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

  @Put('subjects/:subjectId/concept-graph')
  async upsertConceptGraph(
    @Param('subjectId') subjectId: string,
    @Body() body: UpsertConceptGraphDto,
  ) {
    return await this.internal.upsertConceptGraph(subjectId, body);
  }

  @Put('subjects/:subjectId/insight-versions')
  async upsertInsightVersion(
    @Param('subjectId') subjectId: string,
    @Body() body: UpsertInsightVersionDto,
  ) {
    return await this.internal.upsertInsightVersion(subjectId, body);
  }

  @Get('subjects/:subjectId/insight-versions/latest')
  async getLatestInsightVersion(@Param('subjectId') subjectId: string) {
    return await this.internal.getLatestInsightVersion(subjectId);
  }

  @Put('subjects/:subjectId/history')
  async recordSubjectHistory(
    @Param('subjectId') subjectId: string,
    @Body() body: RecordSubjectHistoryDto,
  ) {
    return await this.internal.recordSubjectHistory(subjectId, body);
  }

  @Get('subjects/:subjectId/history')
  async listSubjectHistory(@Param('subjectId') subjectId: string) {
    return await this.internal.listSubjectHistory(subjectId);
  }

  @Put('subjects/:subjectId/exam-template')
  async upsertExamTemplate(
    @Param('subjectId') subjectId: string,
    @Body() body: UpsertExamTemplateDto,
  ) {
    return await this.internal.upsertExamTemplate(subjectId, body);
  }

  @Get('subjects/:subjectId/exam-template/latest')
  async getLatestExamTemplate(@Param('subjectId') subjectId: string) {
    return await this.internal.getLatestExamTemplate(subjectId);
  }

  @Put('subjects/:subjectId/insight-sessions/:sessionId')
  async updateInsightSession(
    @Param('subjectId') subjectId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateInsightSessionDto,
  ) {
    return await this.internal.updateInsightSession(subjectId, sessionId, body);
  }
}
