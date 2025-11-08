/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cuid from 'cuid';
import { createHmac, createHash } from 'crypto';

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

describe('Internal Reindex (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean database
    await prisma.embedding.deleteMany();
    await prisma.documentChunk.deleteMany();
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const signup = async (email: string, password = 'password123') => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken as string;
  };

  const createSubject = async (token: string, name: string) => {
    const res = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

  it('GET /internal/subjects/:subjectId/documents requires API key and returns docs', async () => {
    const token = await signup('reindex_list@test.com');
    const subjectId = await createSubject(token, 'List Docs');

    const user = await prisma.user.findFirst({
      where: { email: 'reindex_list@test.com' },
    });
    const docId = cuid();
    await prisma.document.create({
      data: {
        id: docId,
        filename: 'f.pdf',
        s3Key: `documents/${user!.id}/${docId}/f.pdf`,
        status: 'UPLOADED',
        subjectId,
      },
    });

    // 401 missing
    await request(app.getHttpServer())
      .get(`/internal/subjects/${subjectId}/documents`)
      .expect(401);

    // 401 wrong signature
    await request(app.getHttpServer())
      .get(`/internal/subjects/${subjectId}/documents`)
      .set('X-Timestamp', '0')
      .set('X-Body-SHA256', 'deadbeef')
      .set('X-Signature', 'badsignature')
      .expect(401);

    // 200 ok
    {
      const path = `/internal/subjects/${subjectId}/documents`;
      const { ts, bodySha, sig } = sign('GET', path, {}, INTERNAL_SECRET);
      const ok = await request(app.getHttpServer())
        .get(path)
        .set('X-Timestamp', ts)
        .set('X-Body-SHA256', bodySha)
        .set('X-Signature', sig)
        .expect(200);
      expect(Array.isArray(ok.body)).toBe(true);
      expect(
        ok.body.find((d: any) => d.id === docId && typeof d.s3Key === 'string'),
      ).toBeTruthy();
    }
  });

  it('PUT /internal/reindex/:subjectId/chunks upserts chunks+embeddings idempotently and validates payload', async () => {
    const token = await signup('reindex_upsert@test.com');
    const subjectId = await createSubject(token, 'Upsert Subject');

    const user = await prisma.user.findFirst({
      where: { email: 'reindex_upsert@test.com' },
    });
    const docId = cuid();
    await prisma.document.create({
      data: {
        id: docId,
        filename: 'x.pdf',
        s3Key: `documents/${user!.id}/${docId}/x.pdf`,
        status: 'UPLOADED',
        subjectId,
      },
    });

    // 401 missing
    await request(app.getHttpServer())
      .put(`/internal/reindex/${subjectId}/chunks`)
      .send({})
      .expect(401);

    // 401 wrong
    await request(app.getHttpServer())
      .put(`/internal/reindex/${subjectId}/chunks`)
      .set('X-Timestamp', '0')
      .set('X-Body-SHA256', 'deadbeef')
      .set('X-Signature', 'badsignature')
      .send({})
      .expect(401);

    // 404 doc not under subject
    const otherSubjectId = await createSubject(token, 'Other Subj');
    const bodyBadDoc = {
      documentId: docId, // belongs to subjectId, not otherSubjectId
      model: 'miniLM',
      dim: 384,
      chunks: [{ index: 0, text: 'Hello', embedding: Array(384).fill(0.1) }],
    };
    {
      const path = `/internal/reindex/${otherSubjectId}/chunks`;
      const { ts, bodySha, sig } = sign(
        'PUT',
        path,
        bodyBadDoc,
        INTERNAL_SECRET,
      );
      await request(app.getHttpServer())
        .put(path)
        .set('X-Timestamp', ts)
        .set('X-Body-SHA256', bodySha)
        .set('X-Signature', sig)
        .send(bodyBadDoc)
        .expect(404);
    }

    // 400 dim mismatch
    const badDim = {
      documentId: docId,
      model: 'miniLM',
      dim: 384,
      chunks: [{ index: 0, text: 'Hello', embedding: Array(10).fill(0.1) }],
    };
    {
      const path = `/internal/reindex/${subjectId}/chunks`;
      const { ts, bodySha, sig } = sign('PUT', path, badDim, INTERNAL_SECRET);
      await request(app.getHttpServer())
        .put(path)
        .set('X-Timestamp', ts)
        .set('X-Body-SHA256', bodySha)
        .set('X-Signature', sig)
        .send(badDim)
        .expect(400);
    }

    // 200 valid upsert then idempotent re-upsert
    const makeBatch = (scale: number) => ({
      documentId: docId,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      dim: 1536,
      chunks: [
        {
          index: 0,
          text: 'A',
          embedding: Array(1536)
            .fill(0)
            .map((_, i) => i * 0.001 * scale),
        },
        { index: 1, text: 'B', embedding: Array(1536).fill(0.5 * scale) },
        { index: 2, text: 'C', embedding: Array(1536).fill(1.0 * scale) },
      ],
    });

    const pathOk = `/internal/reindex/${subjectId}/chunks`;
    const b1 = makeBatch(1);
    const s1 = sign('PUT', pathOk, b1, INTERNAL_SECRET);
    const first = await request(app.getHttpServer())
      .put(pathOk)
      .set('X-Timestamp', s1.ts)
      .set('X-Body-SHA256', s1.bodySha)
      .set('X-Signature', s1.sig)
      .send(b1)
      .expect(200);
    expect(first.body.upsertedChunks).toBe(3);
    expect(first.body.upsertedEmbeddings).toBe(3);

    const b2 = makeBatch(2);
    const s2 = sign('PUT', pathOk, b2, INTERNAL_SECRET);
    const second = await request(app.getHttpServer())
      .put(pathOk)
      .set('X-Timestamp', s2.ts)
      .set('X-Body-SHA256', s2.bodySha)
      .set('X-Signature', s2.sig)
      .send(b2) // different embeddings/texts; should update, not duplicate
      .expect(200);
    expect(second.body.upsertedChunks).toBe(3);
    expect(second.body.upsertedEmbeddings).toBe(3);

    // Ensure uniqueness by (documentId,index)
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: docId },
    });
    expect(chunks.length).toBe(3);

    // And embedding 1:1
    for (const ch of chunks) {
      const emb = await prisma.embedding.findUnique({
        where: { chunkId: ch.id },
      });
      expect(emb).toBeTruthy();
      expect(emb?.dim).toBe(1536);
      expect(typeof emb?.model).toBe('string');
    }
  });
});
