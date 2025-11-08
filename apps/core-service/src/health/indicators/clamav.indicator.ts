import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { MalwareScannerService } from '../../documents/malware-scanner.service';

@Injectable()
export class ClamavHealthIndicator extends HealthIndicator {
  constructor(
    private readonly config: ConfigService,
    private readonly scanner: MalwareScannerService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const enabled = this.config.get<boolean>('app.clamav.enabled');

    // If scanner is disabled by config (e.g., tests), mark as optional/healthy
    if (!enabled) {
      return this.getStatus(key, true, { optional: true, reason: 'disabled' });
    }

    try {
      // Attempt a no-op scan to validate connectivity/readiness
      const res = await this.scanner.scan(Buffer.from('HEALTHCHECK'));
      const healthy = Boolean(res?.clean);
      const result = this.getStatus(key, healthy);
      if (!healthy) {
        throw new HealthCheckError('ClamAV reported infected sentinel', result);
      }
      return result;
    } catch (e) {
      const result = this.getStatus(key, false, {
        error: (e as Error).message,
      });
      throw new HealthCheckError('ClamAV check failed', result);
    }
  }
}
