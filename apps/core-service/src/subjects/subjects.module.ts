import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { EmbeddingService } from './embedding.service';
import { AiConsentGuard } from '../auth/guards/ai-consent.guard';
import { SubjectsCrudService } from './subjects-crud.service';
import { SubjectsSearchService } from './subjects-search.service';
import { SubjectsTopicsService } from './subjects-topics.service';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [SubjectsController],
  providers: [
    SubjectsCrudService,
    SubjectsSearchService,
    SubjectsTopicsService,
    EmbeddingService,
    AiConsentGuard,
  ],
  exports: [SubjectsCrudService, SubjectsSearchService, SubjectsTopicsService],
})
export class SubjectsModule {}
