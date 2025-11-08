import { Test, TestingModule } from '@nestjs/testing';
import { InternalService } from './internal.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../queue/queue.service';

// Focused unit tests for InternalService.updateAnalysis()

describe('InternalService.updateAnalysis', () => {
  let service: InternalService;
  let moduleRef: TestingModule;

  const prisma = {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    analysisResult: {
      upsert: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        InternalService,
        { provide: PrismaService, useValue: prisma },
        // ConfigService is injected but unused in updateAnalysis; provide a light stub
        { provide: ConfigService, useValue: { get: jest.fn() } },
        // QueueService is used to publish a subject-level reindex job; stub it out
        { provide: QueueService, useValue: { publishReindexJob: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(InternalService);
    jest.clearAllMocks();
  });

  describe('InternalService.updateMeta', () => {
    let service: InternalService;
    let moduleRef: TestingModule;

    const prisma = {
      document: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [
          InternalService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: { get: jest.fn() } },
          { provide: QueueService, useValue: { publishReindexJob: jest.fn() } },
        ],
      }).compile();

      service = moduleRef.get(InternalService);
      jest.clearAllMocks();
    });

    afterEach(async () => {
      await moduleRef?.close();
    });

    it('throws NotFoundException when document does not exist', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);
      const docDelegate = prisma.document as unknown as {
        update: jest.Mock;
      };
      const updateSpy = jest.spyOn(docDelegate, 'update');

      await expect(
        service.updateMeta('doc-2', { meta: { lang: 'en' } }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('updates document meta on success', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({
        id: 'doc-2',
      });
      const docDelegate = prisma.document as unknown as {
        update: jest.Mock;
      };
      const updateSpy = jest
        .spyOn(docDelegate, 'update')
        .mockResolvedValue({ id: 'doc-2' });

      const out = await service.updateMeta('doc-2', {
        meta: { lang: 'en', headingCount: 5 },
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: { meta: { lang: 'en', headingCount: 5 } },
      });

      expect(out).toEqual({ status: 'ok', documentId: 'doc-2' });
    });
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('throws NotFoundException when document does not exist', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);
    const analysisDelegate = prisma.analysisResult as unknown as {
      upsert: jest.Mock;
    };
    const docDelegate = prisma.document as unknown as { update: jest.Mock };
    const upsertSpy = jest.spyOn(analysisDelegate, 'upsert');
    const updateSpy = jest.spyOn(docDelegate, 'update');

    await expect(
      service.updateAnalysis('doc-1', {
        engineVersion: 'v1',
        resultPayload: { foo: 'bar' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('upserts analysis and marks document as COMPLETED on success', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({
      id: 'doc-1',
    });
    const analysisDelegate = prisma.analysisResult as unknown as {
      upsert: jest.Mock;
    };
    const docDelegate = prisma.document as unknown as { update: jest.Mock };
    const upsertSpy = jest
      .spyOn(analysisDelegate, 'upsert')
      .mockResolvedValue({});
    const updateSpy = jest
      .spyOn(docDelegate, 'update')
      .mockResolvedValue({ id: 'doc-1', status: 'COMPLETED' });

    const out = await service.updateAnalysis('doc-1', {
      engineVersion: 'v1',
      resultPayload: { score: 0.99 },
    });

    expect(upsertSpy).toHaveBeenCalledWith({
      where: { documentId: 'doc-1' },
      update: {
        engineVersion: 'v1',
        resultPayload: { score: 0.99 },
      },
      create: {
        documentId: 'doc-1',
        engineVersion: 'v1',
        resultPayload: { score: 0.99 },
      },
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { status: 'COMPLETED' },
    });

    expect(out).toEqual({ status: 'ok', documentId: 'doc-1' });
  });
});
