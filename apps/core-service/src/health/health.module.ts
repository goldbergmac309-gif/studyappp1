import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { S3Module } from '../s3/s3.module';
import { PrismaHealthIndicator } from './indicators/prisma.indicator';
import { QueueHealthIndicator } from './indicators/queue.indicator';
import { S3HealthIndicator } from './indicators/s3.indicator';
import { LivenessHealthIndicator } from './indicators/liveness.indicator';

@Module({
  imports: [TerminusModule, PrismaModule, QueueModule, S3Module],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    QueueHealthIndicator,
    S3HealthIndicator,
    LivenessHealthIndicator,
  ],
})
export class HealthModule {}
