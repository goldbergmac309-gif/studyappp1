import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { S3Service } from '../s3/s3.service';
import { MalwareScannerService } from './malware-scanner.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('DocumentsService.reprocess', () => {
  let service: DocumentsService;
  let prisma: {
    subject: { findFirst: jest.Mock };
    document: { findFirst: jest.Mock; update: jest.Mock };
  };
  let queue: { publishDocumentJob: jest.Mock };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    prisma = {
      subject: {
        findFirst: jest.fn(),
      },
      document: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as jest.Mocked<Partial<PrismaService>>;

    queue = {
      publishDocumentJob: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: prisma as unknown as PrismaService,
        },
        { provide: QueueService, useValue: queue },
        // Reprocess path does not touch S3 or scanner, but constructor needs providers
        { provide: S3Service, useValue: { putObject: jest.fn() } },
        { provide: MalwareScannerService, useValue: { scan: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
  });

  afterEach(async () => {
    await moduleRef?.close();
    jest.clearAllMocks();
  });

  it('forwards forceOcr and enqueues job, marking status=QUEUED', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: 'sub1' });
    prisma.document.findFirst.mockResolvedValue({
      id: 'doc1',
      s3Key: 'key',
      subjectId: 'sub1',
      status: 'FAILED',
    });
    prisma.document.update.mockResolvedValue({
      id: 'doc1',
      status: 'QUEUED',
    });

    const out = await service.reprocess('user1', 'sub1', 'doc1', true);

    expect(queue.publishDocumentJob).toHaveBeenCalledWith({
      documentId: 'doc1',
      s3Key: 'key',
      userId: 'user1',
      forceOcr: true,
    });
    const updateMock = prisma.document.update as unknown as jest.Mock;
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: { status: 'QUEUED' },
    });
    expect(out).toEqual({ id: 'doc1', status: 'QUEUED' });
  });

  it('throws when subject is missing', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);
    await expect(
      service.reprocess('user1', 'sub1', 'doc1', true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queue.publishDocumentJob).not.toHaveBeenCalled();
  });

  it('throws when document is missing', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: 'sub1' });
    prisma.document.findFirst.mockResolvedValue(null);
    await expect(
      service.reprocess('user1', 'sub1', 'doc1', true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queue.publishDocumentJob).not.toHaveBeenCalled();
  });

  it('rejects non-terminal states', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: 'sub1' });
    prisma.document.findFirst.mockResolvedValue({
      id: 'doc1',
      s3Key: 'key',
      subjectId: 'sub1',
      status: 'PROCESSING',
    });
    await expect(
      service.reprocess('user1', 'sub1', 'doc1', false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(queue.publishDocumentJob).not.toHaveBeenCalled();
  });
});
