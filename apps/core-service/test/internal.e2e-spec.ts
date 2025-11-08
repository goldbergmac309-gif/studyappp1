/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cuid from 'cuid';
import { createHmac, createHash } from 'crypto';

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string };
}

const INTERNAL_KEY = 'dev-internal-key';
const INTERNAL_SECRET = 'dev-internal-secret';

function sign(method: string, path: string, body: unknown, secret: string) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyStr = JSON.stringify(body ?? {});
  const bodySha = createHash('sha256').update(bodyStr).digest('hex');
  const toSign = `${ts}.${method.toUpperCase()}.${path}.${bodySha}`;
  const sig = createHmac('sha256', secret).update(toSign).digest('hex');
  return { ts, bodySha, sig, bodyStr } as const;
}

describe('InternalController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Server;

  beforeEach(async () => {
    // Ensure internal auth secrets are present before the module is created
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;

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

  it('rejects replayed requests older than 30 seconds (401)', async () => {
    const token = await signup('internal_replay@test.com');
    const subjectId = await createSubject(token, 'Replay');

    // Seed a document
    const documentId = cuid();
    await prisma.document.create({
      data: {
        id: documentId,
        filename: 'replay.pdf',
        s3Key: `documents/${subjectId}/${documentId}/replay.pdf`,
        status: 'PROCESSING',
        subjectId,
      },
    });

    const path = `/internal/documents/${documentId}/analysis`;
    const body = {
      engineVersion: 'oracle-v1',
      resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
    };
    // Compute signature using an old timestamp outside the 30s window
    const oldTs = (Math.floor(Date.now() / 1000) - 61).toString();
    const bodyStr = JSON.stringify(body ?? {});
    const bodySha = createHash('sha256').update(bodyStr).digest('hex');
    const toSign = `${oldTs}.PUT.${path}.${bodySha}`;
    const sig = createHmac('sha256', INTERNAL_SECRET)
      .update(toSign)
      .digest('hex');

    await request(httpServer)
      .put(path)
      .set('X-Timestamp', oldTs)
      .set('X-Body-SHA256', bodySha)
      .set('X-Signature', sig)
      .send(body)
      .expect(401);
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

    // 401 when signature is missing
    await request(httpServer)
      .put(`/internal/documents/${documentId}/analysis`)
      .send({
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
      })
      .expect(401);

    // 401 when signature is wrong
    await request(httpServer)
      .put(`/internal/documents/${documentId}/analysis`)
      .set('X-Timestamp', '0')
      .set('X-Body-SHA256', 'deadbeef')
      .set('X-Signature', 'badsignature')
      .send({
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
      })
      .expect(401);

    // 404 when document not found
    {
      const path = `/internal/documents/nonexistent/analysis`;
      const body = {
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [], metrics: { pages: 1, textLength: 1 } },
      };
      const { ts, bodySha, sig } = sign('PUT', path, body, INTERNAL_SECRET);
      await request(httpServer)
        .put(path)
        .set('X-Timestamp', ts)
        .set('X-Body-SHA256', bodySha)
        .set('X-Signature', sig)
        .send(body)
        .expect(404);
    }

    // 200 when key is valid and document exists -> analysis upsert + status COMPLETED
    {
      const path = `/internal/documents/${documentId}/analysis`;
      const body = {
        engineVersion: 'oracle-v1',
        resultPayload: {
          keywords: [{ term: 'ai', score: 1 }],
          metrics: { pages: 3, textLength: 120 },
        },
      };
      const { ts, bodySha, sig } = sign('PUT', path, body, INTERNAL_SECRET);
      await request(httpServer)
        .put(path)
        .set('X-Timestamp', ts)
        .set('X-Body-SHA256', bodySha)
        .set('X-Signature', sig)
        .send(body)
        .expect(200);
    }

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
