import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class LivenessHealthIndicator extends HealthIndicator {
  isHealthy(key: string): Promise<HealthIndicatorResult> {
    // Always healthy if the process is responsive
    return Promise.resolve(this.getStatus(key, true));
  }
}
