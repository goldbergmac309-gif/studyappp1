import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma, ResourceType } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import { QueueService } from '../queue/queue.service';
import cuid from 'cuid';
import { MalwareScannerService } from './malware-scanner.service';
// Note: avoid importing Prisma enum types directly to keep build stable across client versions

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly queue: QueueService,
    private readonly scanner: MalwareScannerService,
  ) {}

  async upload(
    userId: string,
    subjectId: string,
    file: Express.Multer.File,
    resourceType?: string,
  ) {
    // Ensure subject belongs to user
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // MIME/extension allowlist
    const original = (file?.originalname || '').toString();
    const ext = original.includes('.')
      ? original.substring(original.lastIndexOf('.') + 1).toLowerCase()
      : '';
    const mime = (file?.mimetype || '').toLowerCase();
    const allowedExts = new Set(['pdf', 'txt', 'md', 'docx', 'doc']);
    const allowedMimes = new Set([
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]);
    const isAllowed =
      (ext && allowedExts.has(ext)) || (mime && allowedMimes.has(mime));
    if (!isAllowed) {
      throw new UnsupportedMediaTypeException(
        'Unsupported file type. Allowed: PDF, TXT, MD, DOCX, DOC.',
      );
    }

    const documentId = cuid();
    const safeName = encodeURIComponent(file.originalname || 'upload');
    const s3Key = `documents/${userId}/${documentId}/${safeName}`;

    let created = false;
    try {
      const rtRaw = (resourceType ?? '').toString().trim().toUpperCase();
      const allowed: readonly string[] = [
        'EXAM',
        'SYLLABUS',
        'LECTURE_NOTES',
        'TEXTBOOK',
        'PRACTICE_SET',
        'NOTES',
        'OTHER',
      ];
      const rtValid: string | undefined = allowed.includes(rtRaw)
        ? rtRaw
        : undefined;

      const doc = await this.prisma.document.create({
        data: {
          id: documentId,
          filename: file.originalname || 'upload',
          s3Key,
          subjectId,
          status: 'UPLOADED',
          ...(rtValid
            ? { resourceType: rtValid as unknown as ResourceType }
            : {}),
          ...(rtRaw
            ? { meta: { resourceTypeHint: rtRaw } as Prisma.InputJsonValue }
            : {}),
        },
      });
      created = true;
      // Malware scan BEFORE S3 upload/queue
      const scan = await this.scanner.scan(file.buffer);
      if (!scan.clean) {
        throw new BadRequestException(
          `Malware scan failed: ${scan.reason || 'unknown'}`,
        );
      }

      await this.s3.putObject(
        s3Key,
        file.buffer,
        file.mimetype || 'application/octet-stream',
      );

      // Publish job for oracle processing
      this.queue.publishDocumentJob({ documentId, s3Key, userId });

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'QUEUED' },
      });

      return { id: doc.id, status: 'QUEUED' };
    } catch (err) {
      if (created) {
        try {
          await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'FAILED' },
          });
        } catch {
          /* ignore cleanup errors */
        }
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  async listForSubject(userId: string, subjectId: string) {
    // Ensure subject belongs to user
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const docs = await this.prisma.document.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      resourceType: String(d.resourceType),
      meta: d.meta ?? undefined,
    }));
  }

  async getAnalysis(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, subject: { userId } },
      include: { analysisResult: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (!doc.analysisResult || doc.status !== 'COMPLETED') {
      // Analysis not yet available or failed
      throw new NotFoundException('Analysis not available');
    }

    return {
      id: doc.analysisResult.id,
      engineVersion: doc.analysisResult.engineVersion,
      resultPayload: doc.analysisResult.resultPayload as unknown,
    };
  }

  async getSignedUrl(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, subject: { userId } },
      select: { id: true, s3Key: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    const url = await this.s3.getSignedUrl(doc.s3Key);
    return { url } as const;
  }

  async listSubjectInsights(userId: string, subjectId: string) {
    // Ensure subject belongs to user
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const docs = await this.prisma.document.findMany({
      where: { subjectId, status: 'COMPLETED' },
      include: { analysisResult: true },
    });

    const out: Record<
      string,
      { id: string; engineVersion: string; resultPayload: unknown }
    > = {};
    for (const d of docs) {
      if (d.analysisResult) {
        out[d.id] = {
          id: d.analysisResult.id,
          engineVersion: d.analysisResult.engineVersion,
          resultPayload: d.analysisResult.resultPayload as unknown,
        };
      }
    }
    return out;
  }

  async reprocess(
    userId: string,
    subjectId: string,
    documentId: string,
    forceOcr = false,
  ) {
    // Ensure subject belongs to user
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, subjectId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Only allow reprocess for terminal states
    if (
      doc.status === 'QUEUED' ||
      doc.status === 'PROCESSING' ||
      doc.status === 'UPLOADED'
    ) {
      throw new ConflictException('Document is not in a reprocessable state');
    }

    // Publish job and set status to QUEUED
    this.queue.publishDocumentJob({
      documentId: doc.id,
      s3Key: doc.s3Key,
      userId,
      forceOcr,
    });
    await this.prisma.document.update({
      where: { id: doc.id },
      data: { status: 'QUEUED' },
    });
    return { id: doc.id, status: 'QUEUED' as const };
  }
}
