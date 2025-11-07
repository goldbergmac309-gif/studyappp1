import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { QueueModule } from '../queue/queue.module'
import { InsightsService } from './insights.service'
import { InsightsController } from './insights.controller'

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [InsightsService],
  controllers: [InsightsController],
  exports: [InsightsService],
})
export class InsightsModule {}
