/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { S3Service } from '../src/s3/s3.service';
import { QueueService } from '../src/queue/queue.service';
import cuid from 'cuid';
// Local enum mirror for Prisma Status (string union)
const Status = {
  UPLOADED: 'UPLOADED',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string };
}

interface SubjectResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

describe('Documents (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s3Mock: { putObject: jest.Mock };
  let queueMock: { publishDocumentJob: jest.Mock };

  const makeFileBuffer = (content = 'hello world') => Buffer.from(content);

  beforeEach(async () => {
    s3Mock = { putObject: jest.fn().mockResolvedValue(undefined) };
    queueMock = { publishDocumentJob: jest.fn(() => undefined) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(s3Mock)
      .overrideProvider(QueueService)
      .useValue(queueMock)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean database before each test
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

  describe('Reprocess endpoint', () => {
    it('requires JWT', async () => {
      await request(app.getHttpServer())
        .post('/subjects/any/documents/any/reprocess')
        .expect(401)
    })

    it('enforces ownership and document existence (404)', async () => {
      const tokenA = await signup('reproc_a@test.com')
      const tokenB = await signup('reproc_b@test.com')

      const subjectA = await createSubject(tokenA, 'DSP')

      // B tries to reprocess A's (nonexistent for B) -> 404
      await request(app.getHttpServer())
        .post(`/subjects/${subjectA}/documents/nonexistent/reprocess`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404)
    })

    it('happy path: FAILED -> reprocess -> QUEUED and queue.publish called', async () => {
      const email = 'reproc_ok@test.com'
      const token = await signup(email)
      const subjectId = await createSubject(token, 'Numerical')

      const me = await prisma.user.findFirst({ where: { email } })
      expect(me).toBeTruthy()

      // Seed a FAILED document for this subject
      const docId = cuid()
      const seeded = await prisma.document.create({
        data: {
          id: docId,
          filename: 'broken.pdf',
          s3Key: `documents/${me!.id}/${docId}/broken.pdf`,
          status: Status.FAILED,
          subjectId,
        },
      })
      expect(seeded.id).toBe(docId)

      const res = await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/documents/${docId}/reprocess`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body).toHaveProperty('id', docId)
      expect(res.body).toHaveProperty('status', 'QUEUED')

      // Queue publish should be called
      expect(queueMock.publishDocumentJob).toHaveBeenCalledTimes(1)

      const updated = await prisma.document.findUnique({ where: { id: docId } })
      expect(updated?.status).toBe(Status.QUEUED)
    })

    it('returns 409 when document is not in a reprocessable state', async () => {
      const token = await signup('reproc_conflict@test.com')
      const subjectId = await createSubject(token, 'OS')

      const docId = cuid()
      await prisma.document.create({
        data: {
          id: docId,
          filename: 'pending.pdf',
          s3Key: `documents/test/${docId}/pending.pdf`,
          status: Status.QUEUED,
          subjectId,
        },
      })

      await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/documents/${docId}/reprocess`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409)
    })
  })

  it('GET /subjects/:id/insights requires JWT', async () => {
    await request(app.getHttpServer())
      .get('/subjects/any/insights')
      .expect(401);
  });

  it('GET /subjects/:id/insights enforces ownership (404 for other user)', async () => {
    const tokenA = await signup('insights_owner_a@test.com');
    const tokenB = await signup('insights_owner_b@test.com');

    await createSubject(tokenA, 'Graphics');
    const subjectB = await createSubject(tokenB, 'Networks');

    // User A tries to access B's subject insights
    await request(app.getHttpServer())
      .get(`/subjects/${subjectB}/insights`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('GET /subjects/:id/insights returns analysis map for COMPLETED docs with analysis only', async () => {
    const token = await signup('insights_ok@test.com');
    const subjectId = await createSubject(token, 'Compilers');

    const me = await prisma.user.findFirst({
      where: { email: 'insights_ok@test.com' },
    });
    expect(me).toBeTruthy();

    // COMPLETED with analysis
    const docWithAnalysis = await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'done.pdf',
        s3Key: `documents/${me!.id}/done`,
        status: Status.COMPLETED,
        subjectId,
      },
    });
    await prisma.analysisResult.create({
      data: {
        documentId: docWithAnalysis.id,
        engineVersion: 'oracle-v1',
        resultPayload: {
          keywords: [{ term: 'compiler', score: 0.9 }],
          metrics: { pages: 3, textLength: 1200 },
        },
      },
    });

    // COMPLETED without analysis should NOT appear
    const docWithoutAnalysis = await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'missing.pdf',
        s3Key: `documents/${me!.id}/missing`,
        status: Status.COMPLETED,
        subjectId,
      },
    });

    // PROCESSING should NOT appear
    const processingDoc = await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'pending.pdf',
        s3Key: `documents/${me!.id}/pending`,
        status: Status.PROCESSING,
        subjectId,
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/insights`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as Record<
      string,
      { id: string; engineVersion: string; resultPayload: unknown }
    >;
    expect(typeof body).toBe('object');
    expect(Object.keys(body)).toContain(docWithAnalysis.id);
    expect(body[docWithAnalysis.id]).toHaveProperty(
      'engineVersion',
      'oracle-v1',
    );
    expect(body[docWithAnalysis.id]).toHaveProperty('resultPayload');

    // Ensure others are not included
    expect(Object.keys(body)).not.toContain(docWithoutAnalysis.id);
    expect(Object.keys(body)).not.toContain(processingDoc.id);
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
    return (res.body as LoginResponse).accessToken;
  };

  const createSubject = async (token: string, name: string) => {
    const res = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    return (res.body as SubjectResponse).id;
  };

  it('should return 401 for POST /subjects/:id/documents without JWT token', async () => {
    await request(app.getHttpServer())
      .post('/subjects/some-id/documents')
      .attach('file', makeFileBuffer(), 'notes.txt')
      .expect(401);
  });

  it('should return 404 when uploading to a non-existent or unauthorized subject', async () => {
    const token = await signup('doc_nf@test.com');

    await request(app.getHttpServer())
      .post('/subjects/nonexistent-subject-id/documents')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', makeFileBuffer(), 'notes.txt')
      .expect(404);
  });

  it('happy path: upload document -> S3 put, queue publish, status becomes QUEUED', async () => {
    const token = await signup('doc_ok@test.com');
    const subjectId = await createSubject(token, 'Algorithms');

    const uploadRes = await request(app.getHttpServer())
      .post(`/subjects/${subjectId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', makeFileBuffer('PDF_DATA'), 'my-notes.pdf')
      .expect(201);

    const body = uploadRes.body as { id: string; status: string };
    expect(body.id).toBeDefined();
    expect(body.status).toBe('QUEUED');

    // Ensure mocks called
    expect(s3Mock.putObject).toHaveBeenCalledTimes(1);
    expect(queueMock.publishDocumentJob).toHaveBeenCalledTimes(1);

    // Verify DB state
    const doc = await prisma.document.findUnique({ where: { id: body.id } });
    expect(doc).toBeTruthy();
    expect(doc?.status).toBe(Status.QUEUED);
    expect(doc?.s3Key).toContain(`documents/`);
    expect(doc?.s3Key).toContain(body.id);
  });

  it('strict mode: queue failure -> request fails, document marked FAILED', async () => {
    const token = await signup('doc_queue_fail@test.com');
    const subjectId = await createSubject(token, 'Systems');

    queueMock.publishDocumentJob.mockImplementation(() => {
      throw new Error('RMQ unavailable');
    });

    await request(app.getHttpServer())
      .post(`/subjects/${subjectId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', makeFileBuffer('DATA'), 'notes.pdf')
      .expect(500);

    // Pull latest created document for this subject
    const doc = await prisma.document.findFirst({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
    expect(doc).toBeTruthy();
    expect(doc?.status).toBe(Status.FAILED);
  });

  it('strict mode: S3 failure -> request fails, document marked FAILED and queue not called', async () => {
    const token = await signup('doc_s3_fail@test.com');
    const subjectId = await createSubject(token, 'Databases');

    s3Mock.putObject.mockRejectedValueOnce(new Error('S3 down'));

    await request(app.getHttpServer())
      .post(`/subjects/${subjectId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', makeFileBuffer('DATA'), 'notes.pdf')
      .expect(500);

    const doc = await prisma.document.findFirst({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
    expect(doc).toBeTruthy();
    expect(doc?.status).toBe(Status.FAILED);
    expect(queueMock.publishDocumentJob).not.toHaveBeenCalled();
  });

  it('GET /subjects/:id/documents requires JWT and enforces ownership', async () => {
    // 401 when missing JWT
    await request(app.getHttpServer())
      .get('/subjects/any/documents')
      .expect(401);

    const tokenA = await signup('docs_list_a@test.com');
    const tokenB = await signup('docs_list_b@test.com');

    const subjectA = await createSubject(tokenA, 'AI');
    const subjectB = await createSubject(tokenB, 'Systems');

    // Seed documents for A and B directly via Prisma
    const userA = await prisma.user.findFirst({
      where: { email: 'docs_list_a@test.com' },
    });
    const userB = await prisma.user.findFirst({
      where: { email: 'docs_list_b@test.com' },
    });
    expect(userA).toBeTruthy();
    expect(userB).toBeTruthy();

    await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'a1.pdf',
        s3Key: `documents/${userA!.id}/a1`,
        status: Status.QUEUED,
        subjectId: subjectA,
      },
    });
    await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'a2.pdf',
        s3Key: `documents/${userA!.id}/a2`,
        status: Status.UPLOADED,
        subjectId: subjectA,
      },
    });
    await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'b1.pdf',
        s3Key: `documents/${userB!.id}/b1`,
        status: Status.QUEUED,
        subjectId: subjectB,
      },
    });

    // A lists own subject docs -> should get only A docs
    const listA = await request(app.getHttpServer())
      .get(`/subjects/${subjectA}/documents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const arrA = listA.body as Array<{
      id: string;
      filename: string;
      status: string;
      createdAt: string;
    }>;
    expect(Array.isArray(arrA)).toBe(true);
    expect(arrA.length).toBe(2);
    expect(arrA[0]).toHaveProperty('id');
    expect(arrA[0]).toHaveProperty('filename');
    expect(arrA[0]).toHaveProperty('status');
    expect(arrA[0]).toHaveProperty('createdAt');

    // A tries to list B's subject -> 404
    await request(app.getHttpServer())
      .get(`/subjects/${subjectB}/documents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('GET /documents/:id/analysis returns 200 for completed analysis and 404 otherwise', async () => {
    const token = await signup('analysis_get@test.com');
    const subjectId = await createSubject(token, 'NLP');

    const me = await prisma.user.findFirst({
      where: { email: 'analysis_get@test.com' },
    });
    expect(me).toBeTruthy();

    // Seed a COMPLETED doc with analysis
    const completedDoc = await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'done.pdf',
        s3Key: `documents/${me!.id}/done`,
        status: Status.COMPLETED,
        subjectId,
      },
    });
    await prisma.analysisResult.create({
      data: {
        documentId: completedDoc.id,
        engineVersion: 'oracle-v1',
        resultPayload: { keywords: [{ term: 'ai', score: 1.0 }] },
      },
    });

    // Seed a QUEUED doc without analysis
    const queuedDoc = await prisma.document.create({
      data: {
        id: cuid(),
        filename: 'pending.pdf',
        s3Key: `documents/${me!.id}/pending`,
        status: Status.QUEUED,
        subjectId,
      },
    });

    // 200 for completed
    const resOk = await request(app.getHttpServer())
      .get(`/documents/${completedDoc.id}/analysis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(resOk.body).toHaveProperty('id');
    expect(resOk.body).toHaveProperty('engineVersion', 'oracle-v1');
    expect(resOk.body).toHaveProperty('resultPayload');

    // 404 for queued
    await request(app.getHttpServer())
      .get(`/documents/${queuedDoc.id}/analysis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    // Ownership enforced: another user cannot access
    const tokenOther = await signup('analysis_other@test.com');
    await request(app.getHttpServer())
      .get(`/documents/${completedDoc.id}/analysis`)
      .set('Authorization', `Bearer ${tokenOther}`)
      .expect(404);
  });
});
