import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.indicator';
import { QueueHealthIndicator } from './indicators/queue.indicator';
import { S3HealthIndicator } from './indicators/s3.indicator';
import { LivenessHealthIndicator } from './indicators/liveness.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private queue: QueueHealthIndicator,
    private s3: S3HealthIndicator,
    private live: LivenessHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  checkLive() {
    return this.health.check([() => this.live.isHealthy('live')]);
  }

  @Get('ready')
  @HealthCheck()
  checkReady() {
    return this.health.check([
      () => this.prisma.isHealthy('database'),
      () => this.queue.isHealthy('queue'),
      () => this.s3.isHealthy('s3'),
    ]);
  }
}
