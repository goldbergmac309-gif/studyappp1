import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [SubjectsController],
  providers: [SubjectsService, EmbeddingService],
})
export class SubjectsModule {}
