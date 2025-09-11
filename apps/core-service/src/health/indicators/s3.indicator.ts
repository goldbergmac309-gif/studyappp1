import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { S3Service } from '../../s3/s3.service';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private readonly s3: S3Service) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const ok = await this.s3.checkHealth();
      if (ok === null) {
        return this.getStatus(key, true, {
          optional: true,
          reason: 'not configured',
        });
      }
      return this.getStatus(key, ok);
    } catch (e) {
      return this.getStatus(key, false, { error: (e as Error).message });
    }
  }
}
