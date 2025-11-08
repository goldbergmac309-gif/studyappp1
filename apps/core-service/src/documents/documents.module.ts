import { Module } from '@nestjs/common';
import {
  DocumentsController,
  DocumentsQueryController,
  SubjectInsightsController,
} from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { QueueModule } from '../queue/queue.module';
import { MalwareScannerService } from './malware-scanner.service';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    S3Module,
    QueueModule,
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: multer.memoryStorage(),
        limits: {
          fileSize:
            config.get<number>('app.uploads.maxFileSize') ?? 20 * 1024 * 1024,
        },
      }),
    }),
  ],
  controllers: [
    DocumentsController,
    DocumentsQueryController,
    SubjectInsightsController,
  ],
  providers: [DocumentsService, MalwareScannerService],
  exports: [MalwareScannerService],
})
export class DocumentsModule {}
