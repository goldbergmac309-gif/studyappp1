import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalController } from './internal.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [InternalController],
})
export class InternalModule {}
