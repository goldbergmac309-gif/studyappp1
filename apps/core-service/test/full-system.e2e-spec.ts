import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { S3Service } from '../src/s3/s3.service';
import { QueueService } from '../src/queue/queue.service';

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

// Helper to wait for ms
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe('Full System (God Test) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s3Mock: { putObject: jest.Mock };

  const INTERNAL_KEY = 'test-secret';

  const signup = async (email: string, password = 'password123') => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
    return (res.body as LoginResponse).accessToken;
  };

  const login = async (email: string, password = 'password123') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
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

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;

    s3Mock = { putObject: jest.fn().mockResolvedValue(undefined) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(s3Mock)
      // Override QueueService to simulate async worker callback via internal API
      .overrideProvider(QueueService)
      .useValue({
        publishDocumentJob: ({ documentId }: { documentId: string }) => {
          // Simulate the oracle worker posting back after a short delay
          setTimeout(async () => {
            try {
              await request(app.getHttpServer())
                .put(`/internal/documents/${documentId}/analysis`)
                .set('X-Internal-API-Key', INTERNAL_KEY)
                .send({
                  engineVersion: 'oracle-v1',
                  resultPayload: {
                    keywords: [
                      { term: 'systems', score: 1.0 },
                      { term: 'algorithms', score: 0.9 },
                    ],
                    metrics: { pages: 1, textLength: 12 },
                  },
                });
            } catch (e) {
              // swallow test-time errors
            }
          }, 300);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean DB
    await prisma.analysisResult.deleteMany();
    await prisma.document.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('God Test: Alice and Bob end-to-end with async analysis polling', async () => {
    // Alice
    const aliceToken = await signup('alice@test.com');
    const aliceSubject = await createSubject(aliceToken, 'Subject A');

    // Upload A1
    const uploadRes = await request(app.getHttpServer())
      .post(`/subjects/${aliceSubject}/documents`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.from('PDF_DATA'), 'a1.pdf')
      .expect(201);
    const docId: string = uploadRes.body.id;

    // Bob
    const bobToken = await signup('bob@test.com');
    const bobSubject = await createSubject(bobToken, 'Subject B');

    // Bob cannot list Alice's documents
    await request(app.getHttpServer())
      .get(`/subjects/${aliceSubject}/documents`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(404);

    // Alice list should include her doc (sanity)
    const listAlice = await request(app.getHttpServer())
      .get(`/subjects/${aliceSubject}/documents`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    expect(Array.isArray(listAlice.body)).toBe(true);

    // Poll analysis endpoint: first expect 404, then eventually 200
    const server = app.getHttpServer();
    const maxAttempts = 60;
    let got200 = false;

    // Initial 404
    await request(server)
      .get(`/documents/${docId}/analysis`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(404);

    for (let i = 0; i < maxAttempts; i++) {
      await delay(250);
      const res = await request(server)
        .get(`/documents/${docId}/analysis`)
        .set('Authorization', `Bearer ${aliceToken}`);
      if (res.status === 200) {
        got200 = true;
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('engineVersion');
        expect(res.body).toHaveProperty('resultPayload');
        const rp = res.body.resultPayload;
        expect(Array.isArray(rp.keywords)).toBe(true);
        expect(rp.keywords.length).toBeGreaterThan(0);
        expect(rp.keywords[0]).toHaveProperty('term');
        expect(rp.keywords[0]).toHaveProperty('score');
        break;
      }
    }

    expect(got200).toBe(true);
  });
});
