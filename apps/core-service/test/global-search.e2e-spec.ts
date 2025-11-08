/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  accessToken: string;
}

describe('Global Aggregated Search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.noteLink.deleteMany();
    await prisma.noteVersion.deleteMany();
    await prisma.note.deleteMany();
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

  it("GET /search returns only the authenticated user's notes and documents", async () => {
    const http = app.getHttpServer();

    // Create user A
    const userAEmail = `a-${Date.now()}@example.com`;
    const aSignup = await request(http)
      .post('/auth/signup')
      .send({ email: userAEmail, password: 'password123' })
      .expect(201);
    const aToken = (aSignup.body as LoginResponse).accessToken;

    // Create subject for user A via API
    const aSubjectRes = await request(http)
      .post('/subjects')
      .set('Authorization', `Bearer ${aToken}`)
      .send({ name: 'Algebra' })
      .expect(201);
    const aSubjectId: string = aSubjectRes.body.id;

    // Seed notes and documents for A
    await prisma.note.create({
      data: {
        subjectId: aSubjectId,
        title: 'Matrix Factorization',
        content: { type: 'doc', content: [] },
      },
    });
    await prisma.document.create({
      data: {
        id: `docA-${Date.now()}`,
        filename: 'matrix-cheatsheet.pdf',
        s3Key: 's3://mock',
        subjectId: aSubjectId,
        status: 'COMPLETED',
      },
    });

    // Create user B
    const userBEmail = `b-${Date.now()}@example.com`;
    const bSignup = await request(http)
      .post('/auth/signup')
      .send({ email: userBEmail, password: 'password123' })
      .expect(201);
    const bToken = (bSignup.body as LoginResponse).accessToken;

    // Create subject for user B via API
    const bSubjectRes = await request(http)
      .post('/subjects')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ name: 'Algebra B' })
      .expect(201);
    const bSubjectId: string = bSubjectRes.body.id;

    // Seed overlapping content for B (should NOT appear for A)
    await prisma.note.create({
      data: {
        subjectId: bSubjectId,
        title: 'Matrix Factorization (B)',
        content: { type: 'doc', content: [] },
      },
    });
    await prisma.document.create({
      data: {
        id: `docB-${Date.now()}`,
        filename: 'matrix-b-notes.txt',
        s3Key: 's3://mock',
        subjectId: bSubjectId,
        status: 'COMPLETED',
      },
    });

    // Perform search as user A
    const res = await request(http)
      .get('/search')
      .set('Authorization', `Bearer ${aToken}`)
      .query({ q: 'matrix' })
      .expect(200);

    const body = res.body as {
      notes?: Array<{ subjectId: string; title: string }>;
      documents?: Array<{ subjectId: string; filename: string }>;
    };
    expect(body).toBeTruthy();
    expect(Array.isArray(body.notes)).toBe(true);
    expect(Array.isArray(body.documents)).toBe(true);
    // Ensure all hits belong to A's subject
    for (const n of body.notes || []) {
      expect(n.subjectId).toBe(aSubjectId);
      expect((n.title || '').toLowerCase()).toContain('matrix');
    }
    for (const d of body.documents || []) {
      expect(d.subjectId).toBe(aSubjectId);
      expect((d.filename || '').toLowerCase()).toContain('matrix');
    }
  });

  it('GET /search validates q length (>=2)', async () => {
    const http = app.getHttpServer();
    const email = `c-${Date.now()}@example.com`;
    const signup = await request(http)
      .post('/auth/signup')
      .send({ email, password: 'password123' })
      .expect(201);
    const token = (signup.body as LoginResponse).accessToken;

    await request(http)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'a' })
      .expect(400);
  });
});
