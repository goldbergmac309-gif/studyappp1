/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaHealthIndicator } from '../src/health/indicators/prisma.indicator';
import type { HealthIndicatorResult } from '@nestjs/terminus';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('/health/live and /health/ready healthy (GET)', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('/health/ready returns 503 when a dependency is down (GET)', async () => {
    class UnhealthyPrismaIndicator extends PrismaHealthIndicator {
      // Intentionally return a rejected promise to simulate failure
      isHealthy(): Promise<HealthIndicatorResult> {
        return Promise.reject(new Error('forced failure'));
      }
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaHealthIndicator)
      .useClass(UnhealthyPrismaIndicator)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/health/ready').expect(503);
  });
});
