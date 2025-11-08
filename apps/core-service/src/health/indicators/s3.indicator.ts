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
      if (ok === true) return this.getStatus(key, true);

      // If bucket head check failed, attempt to create implicitly by putting a sentinel object (dev/minio)
      try {
        await this.s3.putObject(
          '.health/sentinel.txt',
          Buffer.from('ok'),
          'text/plain',
        );
        const recheck = await this.s3.checkHealth();
        return this.getStatus(key, Boolean(recheck));
      } catch (inner) {
        return this.getStatus(key, false, { error: (inner as Error).message });
      }
    } catch (e) {
      return this.getStatus(key, false, { error: (e as Error).message });
    }
  }
}
