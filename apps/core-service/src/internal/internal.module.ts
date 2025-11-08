import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { HmacGuard } from './guards/hmac.guard';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [ConfigModule, PrismaModule, QueueModule, InsightsModule],
  controllers: [InternalController],
  providers: [InternalService, HmacGuard],
})
export class InternalModule {}
