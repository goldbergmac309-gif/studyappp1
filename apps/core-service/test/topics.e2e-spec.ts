/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const INTERNAL_KEY = 'test-internal-key';

describe('Subject Topics V2 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.embedding.deleteMany();
    await prisma.documentChunk.deleteMany();
    await prisma.analysisResult.deleteMany();
    await prisma.document.deleteMany();
    await prisma.subjectTopics.deleteMany().catch(() => {});
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

  it('PUT /internal/subjects/:id/topics upserts topics; GET /subjects/:id/topics returns them', async () => {
    // Sign up
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'topics@test.com', password: 'password123' })
      .expect(201);
    const token = signup.body.accessToken as string;

    // Create subject
    const subj = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Topics Subject' })
      .expect(201);
    const subjectId: string = subj.body.id;

    // Initially 404
    await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    // Upsert via internal
    const payload = {
      engineVersion: 'oracle-v2',
      topics: [
        {
          label: 'Algebra',
          weight: 3,
          terms: [{ term: 'equations', score: 0.9 }],
        },
        {
          label: 'Calculus',
          weight: 2,
          terms: [{ term: 'derivatives', score: 0.8 }],
        },
      ],
    };

    await request(app.getHttpServer())
      .put(`/internal/subjects/${subjectId}/topics`)
      .set('X-Internal-API-Key', INTERNAL_KEY)
      .send(payload)
      .expect(200);

    // Public GET returns topics envelope
    const res = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body && typeof res.body === 'object').toBe(true);
    expect(Array.isArray(res.body.topics)).toBe(true);
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.computedAt).toBe('string');
    const labels = (res.body.topics as Array<{ label: string }>).map(
      (t) => t.label,
    );
    expect(labels).toEqual(expect.arrayContaining(['Algebra', 'Calculus']));
  });
});
