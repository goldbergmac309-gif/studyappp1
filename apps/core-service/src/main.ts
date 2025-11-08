import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { assertProductionSecrets } from './security/startup-guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Enforce production secret hardening (throws on failure)
  assertProductionSecrets(config);

  // Security headers
  app.use(helmet());

  // Cookie parsing (signed if secret provided)
  const cookieSecret = config.get<string>('app.cookieSecret') || undefined;
  app.use((cookieParser as unknown as (secret?: string) => any)(cookieSecret));

  // CORS
  const nodeEnv = (
    config.get<string>('app.nodeEnv') || 'development'
  ).toLowerCase();
  const isProd = nodeEnv === 'production';
  const clientOrigin = config.get<string>('app.clientOrigin');
  if (isProd && (!clientOrigin || !clientOrigin.trim())) {
    // Fail-fast if a strict origin is not configured in production
    console.error('[Bootstrap] CLIENT_ORIGIN must be set in production');
    process.exit(1);
  }
  app.enableCors({
    origin: isProd ? clientOrigin : true,
    credentials: true,
  });

  // Production secret checks are handled by assertProductionSecrets above.

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
