import {
  Body,
  Controller,
  Headers,
  NotFoundException,
  Param,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';

@Controller('internal')
export class InternalController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Put('documents/:documentId/analysis')
  async updateAnalysis(
    @Param('documentId') documentId: string,
    @Body() body: UpdateAnalysisDto,
    @Headers('x-internal-api-key') apiKey: string | undefined,
  ) {
    const appCfg = this.config.get<{ internalApiKey?: string }>('app');
    if (!appCfg?.internalApiKey || apiKey !== appCfg.internalApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Upsert analysis result for this document
    await this.prisma.analysisResult.upsert({
      where: { documentId },
      update: {
        engineVersion: body.engineVersion,
        resultPayload: body.resultPayload as object,
      },
      create: {
        documentId,
        engineVersion: body.engineVersion,
        resultPayload: body.resultPayload as object,
      },
    });

    // Mark document as completed
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    return { status: 'ok', documentId };
  }
}
