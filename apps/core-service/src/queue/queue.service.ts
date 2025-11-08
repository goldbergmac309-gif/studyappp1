import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import type {
  Connection as AmqpConnection,
  Channel as AmqpChannel,
} from 'amqplib';

type RmqConnection = AmqpConnection & {
  createChannel: () => Promise<AmqpChannel>;
  close: () => Promise<void> | void;
};

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection: RmqConnection | null = null;
  private channel: AmqpChannel | null = null;
  private readonly url?: string;
  private readonly queueName: string;
  private readonly reindexQueueName: string;
  private readonly examQueueName: string;
  private readonly insightsQueueName: string;

  constructor(private readonly config: ConfigService) {
    type AppConfig = {
      rabbitmq?: {
        url?: string;
        queueName?: string;
        reindexQueueName?: string;
        examQueueName?: string;
        insightsQueueName?: string;
      };
    };
    const appCfg = this.config.get<AppConfig>('app');
    this.url = appCfg?.rabbitmq?.url;
    this.queueName = appCfg?.rabbitmq?.queueName ?? 'document_processing_jobs';
    this.reindexQueueName =
      appCfg?.rabbitmq?.reindexQueueName ?? 'v2_reindexing_jobs';
    this.examQueueName =
      appCfg?.rabbitmq?.examQueueName ?? 'exam_generation_jobs';
    this.insightsQueueName =
      appCfg?.rabbitmq?.insightsQueueName ?? 'insights_session_jobs';
  }

  async onModuleInit(): Promise<void> {
    // Gracefully no-op if RabbitMQ is not configured (useful for tests/CI)
    if (!this.url) return;
    // In Jest/E2E, do not attempt to connect to an external RMQ broker
    if (process.env.NODE_ENV === 'test') return;

    try {
      const conn = (await connect(this.url)) as unknown as RmqConnection;
      this.connection = conn;
      this.channel = await conn.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.assertQueue(this.reindexQueueName, { durable: true });
      await this.channel.assertQueue(this.examQueueName, { durable: true });
      await this.channel.assertQueue(this.insightsQueueName, { durable: true });
    } catch {
      // Leave channel/connection null; publish* methods will throw if used without channel.
      this.connection = null;
      this.channel = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
    } catch {
      /* ignore close errors */
    }
    try {
      await this.connection?.close();
    } catch {
      /* ignore close errors */
    }
    this.channel = null;
    this.connection = null;
  }

  publishDocumentJob(payload: {
    documentId: string;
    s3Key: string;
    userId: string;
    forceOcr?: boolean;
  }): void {
    // If RMQ is not configured, gracefully no-op (used in tests/CI)
    if (!this.url) {
      return;
    }
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const ok = this.channel.sendToQueue(
      this.queueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      },
    );
    if (!ok) {
      throw new Error('Failed to enqueue job: internal buffer full');
    }
  }

  /**
   * Health check for RabbitMQ.
   * Returns true if channel is open and queue is accessible. Returns null if RMQ is not configured.
   */
  async checkHealth(): Promise<boolean | null> {
    if (!this.url) return null;
    try {
      // Attempt lazy reconnect if initial connect failed
      if (!this.channel) {
        try {
          const conn = (await connect(this.url)) as unknown as RmqConnection;
          this.connection = conn;
          this.channel = await conn.createChannel();
          await this.channel.assertQueue(this.queueName, { durable: true });
          await this.channel.assertQueue(this.reindexQueueName, {
            durable: true,
          });
          await this.channel.assertQueue(this.examQueueName, { durable: true });
        } catch {
          return false;
        }
      }
      // checkQueue throws if the queue does not exist or channel is closed
      await this.channel.checkQueue(this.queueName);
      await this.channel.checkQueue(this.reindexQueueName);
      await this.channel.checkQueue(this.examQueueName);
      await this.channel.checkQueue(this.insightsQueueName);
      return true;
    } catch {
      return false;
    }
  }

  publishReindexJob(payload: { subjectId: string }): void {
    // If RMQ is not configured, gracefully no-op (used in tests/CI)
    if (!this.url) {
      return;
    }
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const ok = this.channel.sendToQueue(
      this.reindexQueueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      },
    );
    if (!ok) {
      throw new Error('Failed to enqueue reindex job: internal buffer full');
    }
  }

  publishExamJob(payload: {
    examId: string;
    subjectId: string;
    params: Record<string, unknown>;
  }): void {
    // If RMQ is not configured, gracefully no-op (used in tests/CI)
    if (!this.url) {
      return;
    }
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const ok = this.channel.sendToQueue(
      this.examQueueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      },
    );
    if (!ok) {
      throw new Error('Failed to enqueue exam job: internal buffer full');
    }
  }

  publishInsightsSessionJob(payload: {
    subjectId: string;
    sessionId: string;
    documentIds: string[];
  }): void {
    // If RMQ is not configured, gracefully no-op (used in tests/CI)
    if (!this.url) {
      return;
    }
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const ok = this.channel.sendToQueue(
      this.insightsQueueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      },
    );
    if (!ok) {
      throw new Error(
        'Failed to enqueue insights session job: internal buffer full',
      );
    }
  }
}
