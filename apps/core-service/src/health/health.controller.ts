import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.indicator';
import { QueueHealthIndicator } from './indicators/queue.indicator';
import { S3HealthIndicator } from './indicators/s3.indicator';
import { LivenessHealthIndicator } from './indicators/liveness.indicator';
import { ClamavHealthIndicator } from './indicators/clamav.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private queue: QueueHealthIndicator,
    private s3: S3HealthIndicator,
    private live: LivenessHealthIndicator,
    private clamav: ClamavHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  checkLive() {
    return this.health.check([() => this.live.isHealthy('live')]);
  }

  @Get('ready')
  @HealthCheck()
  async checkReady() {
    try {
      return await this.health.check([
        () => this.prisma.isHealthy('database'),
        () => this.queue.isHealthy('queue'),
        () => this.s3.isHealthy('s3'),
        () => this.clamav.isHealthy('clamav'),
      ]);
    } catch {
      // Normalize any underlying error (including generic Error) to 503
      throw new ServiceUnavailableException('Service Unavailable');
    }
  }

  // Debug endpoint to see details without masking errors
  @Get('ready/details')
  @HealthCheck()
  checkReadyDetails() {
    return this.health.check([
      () => this.prisma.isHealthy('database'),
      () => this.queue.isHealthy('queue'),
      () => this.s3.isHealthy('s3'),
      () => this.clamav.isHealthy('clamav'),
    ]);
  }
}
