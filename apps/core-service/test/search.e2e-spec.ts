/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmbeddingService } from '../src/subjects/embedding.service';

class FakeEmbeddingService {
  embedText(text: string) {
    // deterministic 1536-d vector based on input length
    const dim = 1536;
    const base = (text?.length || 1) % 17;
    const v = Array.from({ length: dim }, (_, i) => ((i + base) % 13) / 100);
    return Promise.resolve({ model: 'stub-miniLM', dim, embedding: v });
  }
}

describe('Semantic Search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmbeddingService)
      .useClass(FakeEmbeddingService)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean DB (non-seeded)
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

  it('GET /subjects/:id/search should return nearest chunks with filename and score', async () => {
    // 1) Sign up -> token
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'search@test.com', password: 'password123' })
      .expect(201);
    const token = signup.body.accessToken as string;

    // 2) Create subject
    const created = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Search Subject' })
      .expect(201);
    const subjectId: string = created.body.id;

    // 3) Create a document row directly
    const doc = await prisma.document.create({
      data: {
        id: 'doc_1',
        filename: 'doc1.pdf',
        s3Key: 's3://x/doc1',
        subjectId,
        status: 'COMPLETED',
      },
    });

    // 4) Insert chunk+embedding via internal reindex endpoint (guarded)
    const apiKey = 'test-internal-key';

    const chunk = {
      index: 0,
      text: 'This is a test chunk containing algebra and calculus.',
      tokens: 8,
      embedding: Array.from({ length: 1536 }, (_, i) => (i % 13) / 100), // matches FakeEmbeddingService for a given length
    };

    await request(app.getHttpServer())
      .put(`/internal/reindex/${subjectId}/chunks`)
      .set('X-Internal-API-Key', apiKey)
      .send({
        documentId: doc.id,
        model: 'stub-miniLM',
        dim: 1536,
        chunks: [chunk],
      })
      .expect(200);

    // 5) Perform search
    const res = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/search`)
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'algebra test', k: 5, threshold: 0 })
      .expect(200);

    expect(res.body && typeof res.body === 'object').toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(typeof res.body.tookMs).toBe('number');
    const hit = res.body.results[0];
    expect(hit.documentId).toBe(doc.id);
    expect(hit.documentFilename).toBe('doc1.pdf');
    expect(typeof hit.snippet).toBe('string');
    expect(typeof hit.score).toBe('number');
  });
});
