import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { S3Service } from '../src/s3/s3.service';
import { QueueService } from '../src/queue/queue.service';
import { Status } from '@prisma/client';

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

    const body = uploadRes.body as { id: string; status: Status | string };
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

    const res = await request(app.getHttpServer())
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
    await request(app.getHttpServer()).get('/subjects/any/documents').expect(401);

    const tokenA = await signup('docs_list_a@test.com');
    const tokenB = await signup('docs_list_b@test.com');

    const subjectA = await createSubject(tokenA, 'AI');
    const subjectB = await createSubject(tokenB, 'Systems');

    // Seed documents for A and B directly via Prisma
    const userA = await prisma.user.findFirst({ where: { email: 'docs_list_a@test.com' } });
    const userB = await prisma.user.findFirst({ where: { email: 'docs_list_b@test.com' } });
    expect(userA).toBeTruthy();
    expect(userB).toBeTruthy();

    await prisma.document.create({
      data: {
        filename: 'a1.pdf',
        s3Key: `documents/${userA!.id}/a1`,
        status: Status.QUEUED,
        subjectId: subjectA,
      },
    });
    await prisma.document.create({
      data: {
        filename: 'a2.pdf',
        s3Key: `documents/${userA!.id}/a2`,
        status: Status.UPLOADED,
        subjectId: subjectA,
      },
    });
    await prisma.document.create({
      data: {
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
    const arrA = listA.body as Array<{ id: string; filename: string; status: string; createdAt: string }>;
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

    const me = await prisma.user.findFirst({ where: { email: 'analysis_get@test.com' } });
    expect(me).toBeTruthy();

    // Seed a COMPLETED doc with analysis
    const completedDoc = await prisma.document.create({
      data: {
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
