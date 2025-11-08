import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  AssessmentMode,
  InsightVersionStatus,
  InsightSessionStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertReindexDto } from './dto/upsert-reindex.dto';
import { randomUUID } from 'crypto';
import { UpsertTopicsDto } from './dto/upsert-topics.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { QueueService } from '../queue/queue.service';
import { UpdateMetaDto } from './dto/update-meta.dto';
import {
  UpdateInsightSessionDto,
  InsightSessionStatusDto,
} from './dto/update-insight-session.dto';
import { UpsertStructureDto } from './dto/upsert-structure.dto';
import { UpsertQuestionsDto, QuestionInput } from './dto/upsert-questions.dto';
import {
  UpsertConceptGraphDto,
  ConceptInput,
  QuestionConceptBindingInput,
  QuestionReferenceInput,
  QuestionFamilyInput,
} from './dto/upsert-concept-graph.dto';
import { UpsertInsightVersionDto } from './dto/upsert-insight-version.dto';
import { RecordSubjectHistoryDto } from './dto/record-subject-history.dto';
import { InsightsEventsService } from '../insights/insights-events.service';
import { UpsertExamTemplateDto } from './dto/upsert-exam-template.dto';

type ListQuestion = {
  id: string;
  documentId: string;
  index: number;
  prompt: string;
  marks: number | null;
  marksConfidence: number | null;
  hasNonText: boolean;
  difficulty: number | null;
  assessmentMode: AssessmentMode;
  taxonomyPath: string | null;
  solutionProfile: unknown;
  meta: unknown;
  concepts: Array<{
    conceptId: string;
    slug?: string | null;
    label?: string | null;
    weight: number | null;
    confidence: number | null;
    rationale: string | null;
  }>;
  families: Array<{
    familyId: string;
    label: string;
    archetype: string | null;
    role: string | null;
  }>;
};

@Injectable()
export class InternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
    private readonly events: InsightsEventsService,
  ) {}

  async listSubjectDocuments(subjectId: string) {
    const subj = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subj) throw new NotFoundException('Subject not found');

    const docs = await this.prisma.document.findMany({
      where: { subjectId },
      select: { id: true, s3Key: true, resourceType: true },
      orderBy: { createdAt: 'asc' },
    });
    return docs;
  }

  async listSubjectChunks(subjectId: string) {
    const subj = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subj) throw new NotFoundException('Subject not found');

    const chunks = await this.prisma.documentChunk.findMany({
      where: { document: { subjectId } },
      select: {
        id: true,
        documentId: true,
        index: true,
        text: true,
        tokens: true,
      },
      orderBy: [{ documentId: 'asc' }, { index: 'asc' }],
    });
    return chunks;
  }

  async listSubjectQuestions(subjectId: string): Promise<ListQuestion[]> {
    const subj = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subj) throw new NotFoundException('Subject not found');

    const questions = await this.prisma.question.findMany({
      where: { subjectId },
      include: {
        concepts: {
          select: {
            conceptId: true,
            weight: true,
            confidence: true,
            rationale: true,
            concept: { select: { slug: true, label: true } },
          },
        },
        familyMemberships: {
          select: {
            role: true,
            family: { select: { id: true, label: true, archetype: true } },
          },
        },
      },
      orderBy: [{ documentId: 'asc' }, { index: 'asc' }],
    });
    return questions.map<ListQuestion>((q) => ({
      id: q.id,
      documentId: q.documentId,
      index: q.index,
      prompt: q.prompt,
      marks: q.marks ?? null,
      marksConfidence: q.marksConfidence ?? null,
      hasNonText: !!q.hasNonText,
      difficulty: q.difficulty,
      assessmentMode: q.assessmentMode,
      taxonomyPath: q.taxonomyPath ?? null,
      solutionProfile: q.solutionProfile as unknown,
      meta: q.meta as unknown,
      concepts: q.concepts.map((c) => ({
        conceptId: c.conceptId,
        slug: c.concept?.slug,
        label: c.concept?.label,
        weight: c.weight,
        confidence: c.confidence,
        rationale: c.rationale,
      })),
      families: q.familyMemberships.map((m) => ({
        familyId: m.family.id,
        label: m.family.label,
        archetype: m.family.archetype,
        role: m.role,
      })),
    }));
  }

  async upsertChunksAndEmbeddings(subjectId: string, dto: UpsertReindexDto) {
    // Validate document belongs to subject
    const doc = await this.prisma.document.findFirst({
      where: { id: dto.documentId, subjectId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('Document not found for subject');

    // Enforce pgvector column dimension (Embedding.embedding is vector(app.engine.dimension))
    const EXPECTED_DIM =
      this.config.get<number>('app.engine.dimension') ?? 1536;
    if (dto.dim !== EXPECTED_DIM) {
      throw new BadRequestException(
        `Embedding dim must be ${EXPECTED_DIM}; received ${dto.dim}`,
      );
    }

    // Validate embedding dimensions per-chunk
    for (const c of dto.chunks) {
      if (!Array.isArray(c.embedding) || c.embedding.length !== dto.dim) {
        throw new BadRequestException(
          `Embedding dimension mismatch at index ${c.index}: expected ${dto.dim}, got ${c.embedding.length}`,
        );
      }
      // Ensure all numbers are finite
      if (!c.embedding.every((v) => Number.isFinite(v))) {
        throw new BadRequestException(
          `Embedding contains non-finite numbers at index ${c.index}`,
        );
      }
    }

    // Enrich payload with generated ids for new rows
    const payload = dto.chunks.map((c) => ({
      idx: c.index,
      text: c.text,
      tokens:
        typeof c.tokens === 'number' && Number.isFinite(c.tokens)
          ? c.tokens
          : null,
      embedding: c.embedding,
      newid: randomUUID(),
    }));

    // Execute in a single transaction using raw SQL + jsonb_to_recordset and pgvector cast
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`WITH data AS (
        SELECT *
        FROM jsonb_to_recordset(CAST(${JSON.stringify(payload)} AS jsonb)) AS
          t(idx int, text text, tokens int, embedding double precision[], newid text)
      ), upsert_chunks AS (
        INSERT INTO "DocumentChunk" ("id","documentId","index","text","tokens","createdAt","updatedAt")
        SELECT COALESCE(dc."id", d.newid) AS id,
               ${dto.documentId}::text AS documentId,
               d.idx AS index,
               d.text,
               d.tokens,
               NOW(), NOW()
        FROM data d
        LEFT JOIN "DocumentChunk" dc ON dc."documentId" = ${dto.documentId}::text AND dc."index" = d.idx
        ON CONFLICT ("documentId","index")
        DO UPDATE SET "text" = EXCLUDED."text",
                      "tokens" = EXCLUDED."tokens",
                      "updatedAt" = NOW()
        RETURNING "id","index"
      )
      INSERT INTO "Embedding" ("chunkId","model","dim","embedding","createdAt")
      SELECT c."id", ${dto.model}::text, ${dto.dim}::int,
             ('[' || array_to_string(d.embedding, ',') || ']')::vector,
             NOW()
      FROM data d
      JOIN "DocumentChunk" c ON c."documentId" = ${dto.documentId}::text AND c."index" = d.idx
      ON CONFLICT ("chunkId")
      DO UPDATE SET "model" = EXCLUDED."model",
                    "dim" = EXCLUDED."dim",
                    "embedding" = EXCLUDED."embedding";`;
    });

    return {
      upsertedChunks: dto.chunks.length,
      upsertedEmbeddings: dto.chunks.length,
    };
  }

  async upsertSubjectTopics(subjectId: string, dto: UpsertTopicsDto) {
    // Validate subject exists
    const subj = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subj) throw new NotFoundException('Subject not found');

    await this.prisma.subjectTopics.upsert({
      where: { subjectId },
      update: {
        engineVersion: dto.engineVersion,
        topics: dto.topics as unknown as Prisma.InputJsonValue,
      },
      create: {
        subjectId,
        engineVersion: dto.engineVersion,
        topics: dto.topics as unknown as Prisma.InputJsonValue,
      },
    });

    return { status: 'ok', subjectId } as const;
  }

  async getDocumentContext(documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, subjectId: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return {
      documentId: doc.id,
      subjectId: doc.subjectId,
    };
  }

  async updateAnalysis(documentId: string, body: UpdateAnalysisDto) {
    // Validate document exists
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, subjectId: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Upsert analysis result for this document
    await this.prisma.analysisResult.upsert({
      where: { documentId },
      update: {
        engineVersion: body.engineVersion,
        resultPayload: body.resultPayload as Prisma.InputJsonValue,
      },
      create: {
        documentId,
        engineVersion: body.engineVersion,
        resultPayload: body.resultPayload as Prisma.InputJsonValue,
      },
    });

    // Mark document as completed
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    // Fire-and-forget: ensure subject-level semantic index stays fresh
    try {
      if (doc.subjectId) {
        this.queue.publishReindexJob({ subjectId: doc.subjectId });
      }
    } catch {
      // Non-fatal; insights will still be available per-document
    }

    return { status: 'ok' as const, documentId };
  }

  async updateInsightSession(
    subjectId: string,
    sessionId: string,
    body: UpdateInsightSessionDto,
  ) {
    // Validate session exists and belongs to subject
    const exists = await this.prisma.insightSession.findFirst({
      where: { id: sessionId, subjectId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Insight session not found');
    }

    const statusMap: Record<InsightSessionStatusDto, InsightSessionStatus> = {
      PENDING: 'PENDING',
      READY: 'READY',
      FAILED: 'FAILED',
    };
    const nextStatus: InsightSessionStatus = statusMap[body.status];
    await this.prisma.insightSession.update({
      where: { id: sessionId },
      data: {
        status: nextStatus,
        result: this.toJsonInput(body.result),
      },
    });

    if (nextStatus) {
      this.events.emit(sessionId, nextStatus);
    }

    return { status: 'ok' as const, sessionId };
  }

  async updateMeta(documentId: string, body: UpdateMetaDto) {
    // Validate document exists
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { meta: body.meta as Prisma.InputJsonValue },
    });

    return { status: 'ok' as const, documentId };
  }

  async upsertDocumentStructure(documentId: string, body: UpsertStructureDto) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const structure = await this.prisma.documentStructure.upsert({
      where: { documentId },
      update: {
        schemaVersion: body.schemaVersion ?? undefined,
        pageCount: body.pageCount ?? undefined,
        ocrConfidence: body.ocrConfidence ?? undefined,
        layout: this.toJsonInput(body.layout),
        outline: this.toJsonInput(body.outline),
        stats: this.toJsonInput(body.stats),
      },
      create: {
        documentId,
        schemaVersion: body.schemaVersion ?? 'v1',
        pageCount: body.pageCount ?? null,
        ocrConfidence: body.ocrConfidence ?? null,
        layout: this.toJsonInput(body.layout),
        outline: this.toJsonInput(body.outline),
        stats: this.toJsonInput(body.stats),
      },
    });

    return { status: 'ok' as const, documentId, structureId: structure.id };
  }

  async upsertDocumentQuestions(documentId: string, body: UpsertQuestionsDto) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, subjectId: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (body.subjectId && body.subjectId !== doc.subjectId) {
      throw new BadRequestException(
        'subjectId does not match document subject',
      );
    }

    const structure = await this.prisma.documentStructure.findUnique({
      where: { documentId },
      select: { id: true },
    });

    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      throw new BadRequestException('questions payload is required');
    }

    const results: Array<{ id: string; index: number }> = [];
    await this.prisma.$transaction(async (tx) => {
      for (const question of body.questions) {
        const metaWithHints = this.attachConceptHints(question);
        const row = await tx.question.upsert({
          where: {
            documentId_index: { documentId, index: question.index },
          },
          update: {
            subjectId: doc.subjectId,
            structureId: structure?.id ?? null,
            prompt: question.prompt,
            answer: question.answer ?? null,
            marks: question.marks ?? null,
            marksConfidence: question.marksConfidence ?? null,
            hasNonText:
              typeof question.hasNonText === 'boolean'
                ? question.hasNonText
                : false,
            difficulty: question.difficulty ?? null,
            assessmentMode: this.normalizeAssessmentMode(
              question.assessmentMode,
            ),
            taxonomyPath: question.taxonomyPath ?? null,
            solutionProfile: this.toJsonInput(question.solutionProfile),
            meta: this.toJsonInput(metaWithHints),
          },
          create: {
            documentId,
            subjectId: doc.subjectId,
            structureId: structure?.id ?? null,
            index: question.index,
            prompt: question.prompt,
            answer: question.answer ?? null,
            marks: question.marks ?? null,
            marksConfidence: question.marksConfidence ?? null,
            hasNonText:
              typeof question.hasNonText === 'boolean'
                ? question.hasNonText
                : false,
            difficulty: question.difficulty ?? null,
            assessmentMode: this.normalizeAssessmentMode(
              question.assessmentMode,
            ),
            taxonomyPath: question.taxonomyPath ?? null,
            solutionProfile: this.toJsonInput(question.solutionProfile),
            meta: this.toJsonInput(metaWithHints),
          },
          select: { id: true, index: true },
        });
        results.push(row);
      }
    });

    return {
      status: 'ok' as const,
      documentId,
      questions: results,
    };
  }

  async upsertConceptGraph(subjectId: string, body: UpsertConceptGraphDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const conceptSlugToId = new Map<string, string>();
    await this.prisma.$transaction(async (tx) => {
      await this.upsertConcepts(tx, subjectId, body.concepts, conceptSlugToId);
      await this.upsertConceptLinks(tx, subjectId, body.links, conceptSlugToId);
      await this.syncQuestionConceptScores(
        tx,
        subjectId,
        body.questionConcepts,
        conceptSlugToId,
      );
      await this.syncQuestionFamilies(tx, subjectId, body.families);
    });

    return {
      status: 'ok' as const,
      subjectId,
      conceptCount: conceptSlugToId.size,
    };
  }

  async upsertInsightVersion(subjectId: string, body: UpsertInsightVersionDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const baseStatus = body.status ?? InsightVersionStatus.PROCESSING;
    let resolvedVersion =
      typeof body.version === 'number' && Number.isFinite(body.version)
        ? body.version
        : null;
    if (!resolvedVersion) {
      const latest = await this.prisma.subjectInsightVersion.findFirst({
        where: { subjectId },
        select: { version: true },
        orderBy: { version: 'desc' },
      });
      resolvedVersion = latest ? latest.version + 1 : 1;
    }

    const versionNumber = resolvedVersion ?? 1;

    let record: {
      id: string;
      version: number;
      sessionId: string | null;
      status: InsightVersionStatus;
    };
    if (body.versionId) {
      record = await this.prisma.subjectInsightVersion.update({
        where: { id: body.versionId },
        data: {
          sessionId: body.sessionId ?? undefined,
          status: baseStatus,
          payload: (body.payload as object | undefined) ?? undefined,
          forecast: (body.forecast as object | undefined) ?? undefined,
          diffs: (body.diffs as object | undefined) ?? undefined,
        },
        select: { id: true, version: true, sessionId: true, status: true },
      });
    } else {
      record = await this.prisma.subjectInsightVersion.upsert({
        where: {
          subjectId_version: { subjectId, version: versionNumber },
        },
        update: {
          sessionId: body.sessionId ?? undefined,
          status: baseStatus,
          payload: (body.payload as object | undefined) ?? undefined,
          forecast: (body.forecast as object | undefined) ?? undefined,
          diffs: (body.diffs as object | undefined) ?? undefined,
        },
        create: {
          subjectId,
          version: versionNumber,
          sessionId: body.sessionId ?? undefined,
          status: baseStatus,
          payload: (body.payload as object | undefined) ?? undefined,
          forecast: (body.forecast as object | undefined) ?? undefined,
          diffs: (body.diffs as object | undefined) ?? undefined,
        },
        select: { id: true, version: true, sessionId: true, status: true },
      });
    }

    if (body.publish) {
      await this.prisma.subjectInsightVersion.update({
        where: { id: record.id },
        data: {
          publishedAt: new Date(),
          status: body.status ?? record.status ?? InsightVersionStatus.READY,
        },
      });
    }

    await this.patchInsightSessionProgress(
      body.sessionId ?? record.sessionId,
      body.status ?? record.status ?? baseStatus,
      body,
    );

    return {
      status: 'ok' as const,
      subjectId,
      versionId: record.id,
      version: record.version,
    };
  }

  async getLatestInsightVersion(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    // Prefer the latest published (READY) version to avoid returning an in-progress record
    const latestPublished = await this.prisma.subjectInsightVersion.findFirst({
      where: { subjectId, publishedAt: { not: null } },
      select: { id: true, version: true, payload: true, forecast: true, diffs: true },
      orderBy: { version: 'desc' },
    });
    if (latestPublished) {
      return {
        status: 'ok' as const,
        subjectId,
        versionId: latestPublished.id,
        version: latestPublished.version,
        payload: latestPublished.payload ?? null,
        forecast: latestPublished.forecast ?? null,
        diffs: latestPublished.diffs ?? null,
      };
    }

    // Fallback: latest explicitly READY version
    const latestReady = await this.prisma.subjectInsightVersion.findFirst({
      where: { subjectId, status: InsightVersionStatus.READY },
      select: { id: true, version: true, payload: true, forecast: true, diffs: true },
      orderBy: { version: 'desc' },
    });
    if (latestReady) {
      return {
        status: 'ok' as const,
        subjectId,
        versionId: latestReady.id,
        version: latestReady.version,
        payload: latestReady.payload ?? null,
        forecast: latestReady.forecast ?? null,
        diffs: latestReady.diffs ?? null,
      };
    }

    // No previous snapshot available
    throw new NotFoundException('No insight versions for subject');
  }

  async recordSubjectHistory(subjectId: string, body: RecordSubjectHistoryDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    if (body.comparedVersionId) {
      const exists = await this.prisma.subjectInsightVersion.findUnique({
        where: { id: body.comparedVersionId },
        select: { subjectId: true },
      });
      if (!exists || exists.subjectId !== subjectId) {
        throw new BadRequestException(
          'comparedVersionId does not belong to subject',
        );
      }
    }

    const event = await this.prisma.subjectHistory.create({
      data: {
        subjectId,
        eventDate: new Date(body.eventDate),
        eventType: body.eventType,
        actuals: this.toJsonInput(body.actuals),
        comparedVersionId: body.comparedVersionId ?? null,
      },
      select: { id: true, eventDate: true },
    });

    return { status: 'ok' as const, historyId: event.id };
  }

  async listSubjectHistory(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const events = await this.prisma.subjectHistory.findMany({
      where: { subjectId },
      select: {
        id: true,
        eventDate: true,
        eventType: true,
        comparedVersionId: true,
        actuals: true,
      },
      orderBy: { eventDate: 'desc' },
      take: 10,
    });
    return { status: 'ok' as const, events };
  }

  private toJsonInput(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private attachConceptHints(question: QuestionInput) {
    if (!question.conceptHints?.length && !question.meta) {
      return undefined;
    }
    const meta = { ...(question.meta || {}) };
    if (question.conceptHints?.length) {
      meta.conceptHints = question.conceptHints;
    }
    return meta;
  }

  private normalizeAssessmentMode(value?: AssessmentMode): AssessmentMode {
    if (!value) return AssessmentMode.UNKNOWN;
    if (Object.values(AssessmentMode).includes(value)) {
      return value;
    }
    return AssessmentMode.UNKNOWN;
  }

  private async upsertConcepts(
    tx: Prisma.TransactionClient,
    subjectId: string,
    concepts: ConceptInput[] | undefined,
    slugMap: Map<string, string>,
  ) {
    if (!concepts?.length) return;
    for (const concept of concepts) {
      const row = await tx.subjectConcept.upsert({
        where: {
          subjectId_slug: { subjectId, slug: concept.slug },
        },
        update: {
          label: concept.label,
          description: concept.description ?? null,
          taxonomyPath: concept.taxonomyPath ?? null,
          masteryScore: concept.masteryScore ?? null,
          difficulty: concept.difficulty ?? null,
          coverage: concept.coverage ?? null,
          metadata: this.toJsonInput(concept.metadata),
        },
        create: {
          subjectId,
          slug: concept.slug,
          label: concept.label,
          description: concept.description ?? null,
          taxonomyPath: concept.taxonomyPath ?? null,
          masteryScore: concept.masteryScore ?? null,
          difficulty: concept.difficulty ?? null,
          coverage: concept.coverage ?? null,
          metadata: this.toJsonInput(concept.metadata),
        },
        select: { id: true },
      });
      slugMap.set(concept.slug, row.id);
    }
  }

  private async upsertConceptLinks(
    tx: Prisma.TransactionClient,
    subjectId: string,
    links: UpsertConceptGraphDto['links'],
    slugMap: Map<string, string>,
  ) {
    if (!links?.length) return;
    for (const link of links) {
      const fromId =
        slugMap.get(link.fromSlug) ??
        (await this.lookupConceptId(tx, subjectId, link.fromSlug));
      const toId =
        slugMap.get(link.toSlug) ??
        (await this.lookupConceptId(tx, subjectId, link.toSlug));
      if (!fromId || !toId) continue;
      await tx.conceptLink.upsert({
        where: {
          fromConceptId_toConceptId_relation: {
            fromConceptId: fromId,
            toConceptId: toId,
            relation: link.relation,
          },
        },
        update: {
          weight: link.weight ?? null,
          metadata: this.toJsonInput(link.metadata),
        },
        create: {
          subjectId,
          fromConceptId: fromId,
          toConceptId: toId,
          relation: link.relation,
          weight: link.weight ?? null,
          metadata: this.toJsonInput(link.metadata),
        },
      });
    }
  }

  private async syncQuestionConceptScores(
    tx: Prisma.TransactionClient,
    subjectId: string,
    bindings: QuestionConceptBindingInput[] | undefined,
    slugMap: Map<string, string>,
  ) {
    if (!bindings?.length) return;
    const grouped = new Map<
      string,
      Array<{
        conceptId: string;
        weight?: number;
        confidence?: number;
        rationale?: string;
      }>
    >();
    for (const binding of bindings) {
      const question = await this.resolveQuestionReference(
        tx,
        subjectId,
        binding.question,
      );
      if (!question) {
        continue;
      }
      const conceptId =
        slugMap.get(binding.conceptSlug) ??
        (await this.lookupConceptId(tx, subjectId, binding.conceptSlug));
      if (!conceptId) continue;
      if (!grouped.has(question.id)) {
        grouped.set(question.id, []);
      }
      grouped.get(question.id)!.push({
        conceptId,
        weight: binding.weight ?? undefined,
        confidence: binding.confidence ?? undefined,
        rationale: binding.rationale ?? undefined,
      });
    }

    for (const [questionId, list] of grouped.entries()) {
      await tx.questionConceptScore.deleteMany({
        where: { questionId },
      });
      for (const binding of list) {
        await tx.questionConceptScore.create({
          data: {
            questionId,
            conceptId: binding.conceptId,
            weight: binding.weight ?? null,
            confidence: binding.confidence ?? null,
            rationale: binding.rationale ?? null,
          },
        });
      }
    }
  }

  private async syncQuestionFamilies(
    tx: Prisma.TransactionClient,
    subjectId: string,
    families: QuestionFamilyInput[] | undefined,
  ) {
    if (!families?.length) return;
    for (const family of families) {
      const fam = await tx.questionFamily.upsert({
        where: {
          subjectId_label: { subjectId, label: family.label },
        },
        update: {
          archetype: family.archetype ?? null,
          difficulty: family.difficulty ?? null,
          frequency: family.frequency ?? null,
          synopsis: family.synopsis ?? null,
          metadata: this.toJsonInput(family.metadata),
        },
        create: {
          subjectId,
          label: family.label,
          archetype: family.archetype ?? null,
          difficulty: family.difficulty ?? null,
          frequency: family.frequency ?? null,
          synopsis: family.synopsis ?? null,
          metadata: this.toJsonInput(family.metadata),
        },
      });

      if (family.members?.length) {
        await tx.questionFamilyMembership.deleteMany({
          where: { familyId: fam.id },
        });
        for (const member of family.members) {
          const question = await this.resolveQuestionReference(
            tx,
            subjectId,
            member.question,
          );
          if (!question) continue;
          await tx.questionFamilyMembership.create({
            data: {
              familyId: fam.id,
              questionId: question.id,
              role: member.role ?? null,
            },
          });
        }
      }
    }
  }

  private async resolveQuestionReference(
    tx: Prisma.TransactionClient,
    subjectId: string,
    ref?: QuestionReferenceInput,
  ): Promise<{ id: string; documentId: string; index: number } | null> {
    if (!ref) return null;
    if (ref.questionId) {
      const row = await tx.question.findUnique({
        where: { id: ref.questionId },
        select: { id: true, documentId: true, index: true, subjectId: true },
      });
      if (!row || row.subjectId !== subjectId) return null;
      return row;
    }
    if (ref.documentId && typeof ref.index === 'number') {
      const row = await tx.question.findUnique({
        where: {
          documentId_index: {
            documentId: ref.documentId,
            index: ref.index,
          },
        },
        select: { id: true, documentId: true, index: true, subjectId: true },
      });
      if (!row || row.subjectId !== subjectId) return null;
      return row;
    }
    return null;
  }

  private async lookupConceptId(
    tx: Prisma.TransactionClient,
    subjectId: string,
    slug: string,
  ): Promise<string | null> {
    if (!slug) return null;
    const concept = await tx.subjectConcept.findUnique({
      where: { subjectId_slug: { subjectId, slug } },
      select: { id: true },
    });
    return concept?.id ?? null;
  }

  private async patchInsightSessionProgress(
    sessionId: string | null | undefined,
    status: InsightVersionStatus,
    dto: UpsertInsightVersionDto,
  ) {
    if (!sessionId) return;
    const session = await this.prisma.insightSession.findUnique({
      where: { id: sessionId },
      select: { id: true, result: true },
    });
    if (!session) return;

    const nextResult: Record<string, unknown> = session.result
      ? { ...(session.result as Record<string, unknown>) }
      : {};

    const hasProgressUpdate =
      typeof dto.progressRatio === 'number' || !!dto.progressStage;
    if (hasProgressUpdate) {
      const prev =
        (nextResult.progress as
          | { stage?: string; ratio?: number }
          | undefined) ?? {};
      nextResult.progress = {
        stage: dto.progressStage ?? prev.stage,
        ratio:
          typeof dto.progressRatio === 'number'
            ? dto.progressRatio
            : prev.ratio,
        updatedAt: new Date().toISOString(),
      };
    }

    if (status === InsightVersionStatus.READY) {
      if (dto.payload) {
        nextResult.output = dto.payload;
      }
      if (dto.forecast) {
        nextResult.forecast = dto.forecast;
      }
      if (dto.diffs) {
        nextResult.diffs = dto.diffs;
      }
    }

    const sessionStatus = this.mapVersionStatusToSessionStatus(status);
    await this.prisma.insightSession.update({
      where: { id: sessionId },
      data: {
        status: sessionStatus,
        result: Object.keys(nextResult).length
          ? (nextResult as Prisma.InputJsonValue)
          : undefined,
      },
    });
    this.events.emit(sessionId, sessionStatus);
  }

  private mapVersionStatusToSessionStatus(
    status: InsightVersionStatus,
  ): InsightSessionStatus {
    switch (status) {
      case InsightVersionStatus.READY:
        return 'READY';
      case InsightVersionStatus.FAILED:
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  async upsertExamTemplate(subjectId: string, body: UpsertExamTemplateDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const latest = await this.prisma.examTemplate.findFirst({
      where: { subjectId },
      select: { version: true },
      orderBy: { version: 'desc' },
    });
    const nextVersion = latest ? latest.version + 1 : 1;

    const row = await this.prisma.examTemplate.create({
      data: {
        subjectId,
        version: nextVersion,
        season: body.season ?? null,
        blueprint: body.blueprint as Prisma.InputJsonValue,
      },
      select: { id: true, version: true },
    });

    return { status: 'ok' as const, versionId: row.id, version: row.version };
  }

  async getLatestExamTemplate(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const tmpl = await this.prisma.examTemplate.findFirst({
      where: { subjectId },
      select: { id: true, version: true, season: true, blueprint: true },
      orderBy: { version: 'desc' },
    });
    if (!tmpl) return { status: 'ok' as const, template: null };
    return { status: 'ok' as const, template: tmpl };
  }
}
