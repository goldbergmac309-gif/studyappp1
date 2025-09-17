import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [InternalController],
  providers: [InternalService, InternalApiKeyGuard],
})
export class InternalModule {}
