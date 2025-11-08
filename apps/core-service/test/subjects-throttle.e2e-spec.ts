/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { EmbeddingService } from '../src/subjects/embedding.service';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  accessToken: string;
}

describe('Subjects Search Throttling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  class FakeEmbeddingService {
    embedText(text: string) {
      const dim = 1536;
      const base = (text?.length || 1) % 17;
      const v = Array.from({ length: dim }, (_, i) => ((i + base) % 13) / 100);
      return Promise.resolve({ model: 'stub-miniLM', dim, embedding: v });
    }
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmbeddingService)
      .useClass(FakeEmbeddingService)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.embedding.deleteMany();
    await prisma.documentChunk.deleteMany();
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

  it('enforces 20/min per-user throttle on subject search (429 after ~20 requests)', async () => {
    const http = app.getHttpServer();

    // Sign up user, create subject, and consent to AI
    const signup = await request(http)
      .post('/auth/signup')
      .send({
        email: `throttle-${Date.now()}@test.com`,
        password: 'password123',
      })
      .expect(201);
    const token = (signup.body as LoginResponse).accessToken;

    const subjectRes = await request(http)
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Throttle Subj' })
      .expect(201);
    const subjectId: string = subjectRes.body.id;

    await request(http)
      .post('/users/@me/consent-ai')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Hammer the search route until we see the first 429; route-level named profile 'search' is 20/min
    let successCount = 0;
    let got429 = false;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await request(http)
        .get(`/subjects/${subjectId}/search`)
        .set('Authorization', `Bearer ${token}`)
        .query({ query: 'algebra', k: 1 });
      if (res.status === 200) {
        successCount++;
      } else if (res.status === 429) {
        got429 = true;
        break;
      } else {
        // Non-OK/non-429 means unexpected error
        throw new Error(`Unexpected status ${res.status}`);
      }
    }

    expect(got429).toBeTruthy();
    // Accept either 19 or 20 initial successes to account for timing
    expect([19, 20]).toContain(successCount);
  });
});
