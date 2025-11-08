import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubjectsModule } from './subjects/subjects.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { DocumentsModule } from './documents/documents.module';
import { S3Module } from './s3/s3.module';
import { QueueModule } from './queue/queue.module';
import { InternalModule } from './internal/internal.module';
import { HealthModule } from './health/health.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { NotesModule } from './notes/notes.module';
import { SearchModule } from './search/search.module';
import { InsightsModule } from './insights/insights.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

// Relax rate limits in non-production to improve local DX, but keep test aligned with E2E assertions.
const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';
const DEFAULT_TTL_MS = 60_000;
const DEFAULT_LIMIT = isProd ? 100 : 1000;
const SEARCH_TTL_MS = 60_000;
// E2E expects 20/min limit; enforce in production and test. Allow higher in local dev only.
const SEARCH_LIMIT = isProd || isTest ? 20 : 200;

@Module({
  imports: [
    ThrottlerModule.forRoot({
      getTracker: (req: Record<string, any>) => {
        try {
          const user = (req as { user?: { id?: string } })?.user;
          return (user?.id as string) || (req?.ip as string) || 'anon';
        } catch {
          return 'anon';
        }
      },
      throttlers: [
        {
          name: 'default',
          ttl: DEFAULT_TTL_MS,
          limit: DEFAULT_LIMIT,
        },
        {
          name: 'search',
          ttl: SEARCH_TTL_MS,
          limit: SEARCH_LIMIT,
          skipIf: (context: ExecutionContext) => {
            const handler = context.getHandler?.();
            const classRef = context.getClass?.();
            const isSubjectsSearch =
              classRef?.name === 'SubjectsController' &&
              handler?.name === 'search';
            return !isSubjectsSearch;
          },
        },
      ],
    }),
    ConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    SubjectsModule,
    S3Module,
    QueueModule,
    DocumentsModule,
    InternalModule,
    HealthModule,
    WorkspaceModule,
    NotesModule,
    SearchModule,
    InsightsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
