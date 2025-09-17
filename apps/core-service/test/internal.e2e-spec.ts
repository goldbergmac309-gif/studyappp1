/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cuid from 'cuid';

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string };
}

const INTERNAL_KEY = 'dev-internal-key';

describe('InternalController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Server;

  beforeEach(async () => {
    // Ensure internal key is present before the module is created
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean database
    await prisma.analysisResult.deleteMany();
    await prisma.document.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as unknown as Server;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const signup = async (email: string, password = 'password123') => {
    const res = await request(httpServer)
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
    return (res.body as LoginResponse).accessToken;
  };

  const createSubject = async (token: string, name: string) => {
    const res = await request(httpServer)
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

  it('PUT /internal/documents/:id/analysis enforces API key and document existence, then upserts analysis and marks COMPLETED', async () => {
    const token = await signup('internal_ok@test.com');
    const subjectId = await createSubject(token, 'E2E Internal');

    const me = await prisma.user.findFirst({
      where: { email: 'internal_ok@test.com' },
    });
    expect(me).toBeTruthy();

    // Seed a document in a non-completed state
    const documentId = cuid();
    await prisma.document.create({
      data: {
        id: documentId,
        filename: 'internal.pdf',
        s3Key: `documents/${me!.id}/${documentId}/internal.pdf`,
        status: 'PROCESSING',
        subjectId,
      },
    });

    // 401 when key is missing
    await request(httpServer)
      .put(`/internal/documents/${documentId}/analysis`)
      .send({
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
      })
      .expect(401);

    // 401 when key is wrong
    await request(httpServer)
      .put(`/internal/documents/${documentId}/analysis`)
      .set('X-Internal-API-Key', 'wrong')
      .send({
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
      })
      .expect(401);

    // 404 when document not found
    await request(httpServer)
      .put(`/internal/documents/nonexistent/analysis`)
      .set('X-Internal-API-Key', INTERNAL_KEY)
      .send({
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
      })
      .expect(404);

    // 200 when key is valid and document exists -> analysis upsert + status COMPLETED
    await request(httpServer)
      .put(`/internal/documents/${documentId}/analysis`)
      .set('X-Internal-API-Key', INTERNAL_KEY)
      .send({
        engineVersion: 'oracle-v1',
        resultPayload: {
          keywords: [{ term: 'ai', score: 1 }],
          metrics: { pages: 3, textLength: 120 },
        },
      })
      .expect(200);

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { analysisResult: true },
    });
    expect(doc?.status).toBe('COMPLETED');
    expect(doc?.analysisResult?.engineVersion).toBe('oracle-v1');

    // Owner can GET /documents/:id/analysis now
    await request(httpServer)
      .get(`/documents/${documentId}/analysis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
