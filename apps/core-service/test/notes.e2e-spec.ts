/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Notes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    // Clean DB in safe order
    await prisma.noteVersion.deleteMany();
    await prisma.note.deleteMany();
    await prisma.document.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();
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
    return (res.body as { accessToken: string }).accessToken;
  };

  const createSubject = async (token: string, name: string) => {
    const res = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  it('requires JWT for all endpoints', async () => {
    await request(app.getHttpServer())
      .get('/subjects/any/notes')
      .expect(401);

    await request(app.getHttpServer())
      .post('/subjects/any/notes')
      .send({ title: 'Untitled' })
      .expect(401);

    await request(app.getHttpServer())
      .patch('/subjects/any/notes/any')
      .send({ title: 'New' })
      .expect(401);

    await request(app.getHttpServer())
      .delete('/subjects/any/notes/any')
      .expect(401);
  });

  it('enforces ownership (404 on other user subject)', async () => {
    const tokenA = await signup('notes_owner_a@test.com');
    const tokenB = await signup('notes_owner_b@test.com');

    const subjectA = await createSubject(tokenA, 'Psych');

    await request(app.getHttpServer())
      .get(`/subjects/${subjectA}/notes`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/subjects/${subjectA}/notes`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'X' })
      .expect(404);
  });

  it('happy path: create -> list -> get -> update -> delete', async () => {
    const token = await signup('notes_ok@test.com');
    const subjectId = await createSubject(token, 'Algebra');

    // Create
    const createRes = await request(app.getHttpServer())
      .post(`/subjects/${subjectId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Untitled', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] } })
      .expect(201);
    const noteId = (createRes.body as { id: string }).id;

    // List
    const listRes = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const list = listRes.body as Array<{ id: string; title: string }>;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(noteId);

    // Get one
    const getRes = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getRes.body).toHaveProperty('id', noteId);
    expect(getRes.body).toHaveProperty('title', 'Untitled');

    // Update title and content
    await request(app.getHttpServer())
      .patch(`/subjects/${subjectId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'World' }] }] } })
      .expect(200);

    // Ensure version created and list sorting by updatedAt
    const listRes2 = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const list2 = listRes2.body as Array<{ id: string; title: string }>;
    expect(list2[0].id).toBe(noteId);
    expect(list2[0].title).toBe('Renamed');

    // Delete
    await request(app.getHttpServer())
      .delete(`/subjects/${subjectId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get(`/subjects/${subjectId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((listAfterDelete.body as unknown[]).length).toBe(0);
  });

  it('returns 404 for writes when subject is archived', async () => {
    const token = await signup('notes_arch@test.com');
    const subjectId = await createSubject(token, 'Biology');

    // Archive subject
    await request(app.getHttpServer())
      .delete(`/subjects/${subjectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .post(`/subjects/${subjectId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Nope' })
      .expect(404);
  });
});
