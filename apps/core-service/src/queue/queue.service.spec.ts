import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

import { connect } from 'amqplib';

describe('QueueService', () => {
  let service: QueueService;
  let moduleRef: TestingModule;

  const mockConfig = (url?: string) => ({
    get: jest.fn(() => ({
      rabbitmq: {
        url,
        queueName: 'document_processing_jobs',
        reindexQueueName: 'v2_reindexing_jobs',
      },
    })),
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should no-op on init when RabbitMQ URL is undefined', async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: ConfigService, useValue: mockConfig(undefined) },
      ],
    }).compile();

    service = moduleRef.get(QueueService);
    await service.onModuleInit();

    expect(connect as unknown as jest.Mock).not.toHaveBeenCalled();
  });

  it('should throw when publishing without initialized channel', async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        QueueService,
        // Provide a URL so the service does not no-op and instead throws due to missing channel
        {
          provide: ConfigService,
          useValue: mockConfig('amqp://guest:guest@localhost:5672//'),
        },
      ],
    }).compile();

    service = moduleRef.get(QueueService);

    expect(() =>
      service.publishDocumentJob({
        documentId: 'doc1',
        s3Key: 's3/key',
        userId: 'user1',
      }),
    ).toThrow('RabbitMQ channel not initialized');
  });
});
