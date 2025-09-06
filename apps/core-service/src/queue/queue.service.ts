import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import type { Connection as AmqpConnection, Channel as AmqpChannel } from 'amqplib';

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

  constructor(private readonly config: ConfigService) {
    type AppConfig = { rabbitmq?: { url?: string; queueName?: string } };
    const appCfg = this.config.get<AppConfig>('app');
    this.url = appCfg?.rabbitmq?.url;
    this.queueName = appCfg?.rabbitmq?.queueName ?? 'document_processing_jobs';
  }

  async onModuleInit(): Promise<void> {
    // Gracefully no-op if RabbitMQ is not configured (useful for tests/CI)
    if (!this.url) return;

    const conn = (await connect(this.url)) as unknown as RmqConnection;
    this.connection = conn;
    this.channel = await conn.createChannel();
    await this.channel.assertQueue(this.queueName, { durable: true });
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
  }): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const ok = this.channel.sendToQueue(
      this.queueName,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
    if (!ok) {
      throw new Error('Failed to enqueue job: internal buffer full');
    }
  }
}
