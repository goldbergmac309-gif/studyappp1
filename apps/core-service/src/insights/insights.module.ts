import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { InsightsEventsService } from './insights-events.service';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [InsightsService, InsightsEventsService],
  controllers: [InsightsController],
  exports: [InsightsService, InsightsEventsService],
})
export class InsightsModule {}
