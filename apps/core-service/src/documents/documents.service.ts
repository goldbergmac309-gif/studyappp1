import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { QueueService } from '../queue/queue.service';
import cuid from 'cuid';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly queue: QueueService,
  ) {}

  async upload(userId: string, subjectId: string, file: Express.Multer.File) {
    // Ensure subject belongs to user
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const documentId = cuid();
    const safeName = encodeURIComponent(file.originalname || 'upload');
    const s3Key = `documents/${userId}/${documentId}/${safeName}`;

    let created = false;
    try {
      const doc = await this.prisma.document.create({
        data: {
          id: documentId,
          filename: file.originalname || 'upload',
          s3Key,
          subjectId,
          status: 'UPLOADED',
        },
      });
      created = true;

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
      throw err;
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
}
