import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(private readonly queue: QueueService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const status = await this.queue.checkHealth();
      if (status === null) {
        return this.getStatus(key, true, {
          optional: true,
          reason: 'not configured',
        });
      }
      const result = this.getStatus(key, status);
      if (!status) {
        throw new HealthCheckError('Queue check failed', result);
      }
      return result;
    } catch (e) {
      const result = this.getStatus(key, false, {
        error: (e as Error).message,
      });
      throw new HealthCheckError('Queue check failed', result);
    }
  }
}
