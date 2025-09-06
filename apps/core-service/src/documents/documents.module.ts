import { Module } from '@nestjs/common';
import {
  DocumentsController,
  DocumentsQueryController,
} from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, S3Module, QueueModule],
  controllers: [DocumentsController, DocumentsQueryController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
