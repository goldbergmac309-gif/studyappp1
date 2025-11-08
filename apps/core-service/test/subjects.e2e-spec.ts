/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QueueService } from '../src/queue/queue.service';

describe('Subjects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean database before each test
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

  describe('Pagination & Recency (lastAccessedAt)', () => {
    it('GET /subjects supports page & pageSize and orders by createdAt desc by default', async () => {
      const signup = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'paginate@test.com', password: 'password123' })
        .expect(201);
      const token = signup.body.accessToken as string;

      // Create 7 subjects
      const names = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
      for (const n of names) {
        await request(app.getHttpServer())
          .post('/subjects')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: n })
          .expect(201);
      }

      // Page 1 size 3 -> latest 3 (S7,S6,S5)
      const p1 = await request(app.getHttpServer())
        .get('/subjects')
        .query({ page: 1, pageSize: 3 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(p1.body).toHaveLength(3);
      const p1names = (p1.body as Array<{ name: string }>).map((s) => s.name);
      expect(p1names).toEqual(['S7', 'S6', 'S5']);

      // Page 2 -> next 3 (S4,S3,S2)
      const p2 = await request(app.getHttpServer())
        .get('/subjects')
        .query({ page: 2, pageSize: 3 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(p2.body).toHaveLength(3);
      const p2names = (p2.body as Array<{ name: string }>).map((s) => s.name);
      expect(p2names).toEqual(['S4', 'S3', 'S2']);

      // Page 3 -> remaining (S1)
      const p3 = await request(app.getHttpServer())
        .get('/subjects')
        .query({ page: 3, pageSize: 3 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const p3names = (p3.body as Array<{ name: string }>).map((s) => s.name);
      expect(p3names).toEqual(['S1']);
    });

    it('recent filter uses lastAccessedAt; viewing a subject bumps it into recent even if old', async () => {
      const signup = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'lastaccessed@test.com', password: 'password123' })
        .expect(201);
      const token = signup.body.accessToken as string;

      // Create two subjects
      await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'FreshNow' })
        .expect(201);
      const old = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'VeryOld' })
        .expect(201);

      // Backdate the OLD one to 30 days ago
      const id = old.body.id as string;
      const iso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await prisma.$executeRawUnsafe(
        `UPDATE "Subject" SET "createdAt" = '${iso}', "lastAccessedAt" = NULL WHERE "id" = '${id}'`,
      );

      // recent -> should include FreshNow, exclude VeryOld
      const before = await request(app.getHttpServer())
        .get('/subjects')
        .query({ filter: 'recent' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const beforeNames = (before.body as Array<{ name: string }>).map(
        (s) => s.name,
      );
      expect(beforeNames).toContain('FreshNow');
      expect(beforeNames).not.toContain('VeryOld');

      // View VeryOld -> bumps lastAccessedAt to now
      await request(app.getHttpServer())
        .get(`/subjects/${old.body.id as string}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // recent -> should now include VeryOld
      const after = await request(app.getHttpServer())
        .get('/subjects')
        .query({ filter: 'recent' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const afterNames = (after.body as Array<{ name: string }>).map(
        (s) => s.name,
      );
      expect(afterNames).toContain('VeryOld');
    });
  });

  describe('GET /subjects/:id', () => {
    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer()).get('/subjects/some-id').expect(401);
    });

    it('should return 404 for non-existent subject (owned or not)', async () => {
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'getid_nf@test.com', password: 'password123' })
        .expect(201);
      const token = signupResponse.body.accessToken as string;

      await request(app.getHttpServer())
        .get('/subjects/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it("should return 404 for other user's subject (ownership enforced)", async () => {
      // User A
      const a = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'getid_a@test.com', password: 'password123' })
        .expect(201);
      const tokenA = a.body.accessToken as string;

      // User B
      const b = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'getid_b@test.com', password: 'password123' })
        .expect(201);
      const tokenB = b.body.accessToken as string;

      // A creates subject
      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Owned by A' })
        .expect(201);
      const subjectId = created.body.id as string;

      // B tries to fetch -> 404
      await request(app.getHttpServer())
        .get(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('should return 200 and subject for the owner', async () => {
      const user = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'getid_owner@test.com', password: 'password123' })
        .expect(201);
      const token = user.body.accessToken as string;

      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Subject' })
        .expect(201);
      const subjectId = created.body.id as string;

      const res = await request(app.getHttpServer())
        .get(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(subjectId);
      expect(res.body.name).toBe('My Subject');
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Unauthorized Access Tests', () => {
    it('should return 401 for GET /subjects without JWT token', () => {
      return request(app.getHttpServer()).get('/subjects').expect(401);
    });

    it('should return 401 for POST /subjects without JWT token', () => {
      return request(app.getHttpServer())
        .post('/subjects')
        .send({ name: 'Test Subject' })
        .expect(401);
    });
  });

  describe('Input Validation Tests', () => {
    let userToken: string;

    beforeEach(async () => {
      // Create a user and get token for validation tests
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'validation@test.com',
          password: 'password123',
        })
        .expect(201);

      userToken = signupResponse.body.accessToken;
    });

    it('should return 400 for POST /subjects with empty request body', () => {
      return request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 for POST /subjects with empty name string', () => {
      return request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should return 400 for POST /subjects with name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      return request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: longName })
        .expect(400);
    });
  });

  describe('Data Ownership & Isolation Tests (CRITICAL)', () => {
    let tokenA: string;
    let tokenB: string;
    let subjectAId: string;

    it('should enforce complete data isolation between users', async () => {
      // Step A: Create two distinct users
      const userAResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'usera@test.com',
          password: 'password123',
        })
        .expect(201);
      tokenA = userAResponse.body.accessToken;

      const userBResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'userb@test.com',
          password: 'password123',
        })
        .expect(201);
      tokenB = userBResponse.body.accessToken;

      // Step B: User A creates "Subject A"
      const subjectAResponse = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Subject A' })
        .expect(201);

      subjectAId = subjectAResponse.body.id;
      expect(subjectAResponse.body.name).toBe('Subject A');

      // Step C: User B gets subjects - should NOT contain "Subject A"
      const userBSubjectsResponse = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(userBSubjectsResponse.body).toEqual([]);
      expect(
        userBSubjectsResponse.body.find((s: any) => s.name === 'Subject A'),
      ).toBeUndefined();

      // Step D: Verify User A can see their own subject
      const userASubjectsResponse = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(userASubjectsResponse.body).toHaveLength(1);
      expect(userASubjectsResponse.body[0].name).toBe('Subject A');
      expect(userASubjectsResponse.body[0].id).toBe(subjectAId);
    });
  });

  describe('Happy Path Tests', () => {
    let userToken: string;

    beforeEach(async () => {
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'happypath@test.com',
          password: 'password123',
        })
        .expect(201);

      userToken = signupResponse.body.accessToken;
    });

    it('should allow user to create multiple subjects and retrieve only their own', async () => {
      // Create first subject
      const subject1Response = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Mathematics' })
        .expect(201);

      expect(subject1Response.body.name).toBe('Mathematics');
      expect(subject1Response.body.id).toBeDefined();

      // Create second subject
      const subject2Response = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Physics' })
        .expect(201);

      expect(subject2Response.body.name).toBe('Physics');
      expect(subject2Response.body.id).toBeDefined();

      // Retrieve all subjects for this user
      const allSubjectsResponse = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(allSubjectsResponse.body).toHaveLength(2);

      const list = allSubjectsResponse.body as Array<{ name: string }>;
      const subjectNames = list.map((s) => s.name);
      expect(subjectNames).toContain('Mathematics');
      expect(subjectNames).toContain('Physics');

      // Verify all subjects belong to this user (implicit through isolation)
      allSubjectsResponse.body.forEach((subject: any) => {
        expect(subject.id).toBeDefined();
        expect(subject.name).toBeDefined();
        expect(subject.createdAt).toBeDefined();
        expect(subject.updatedAt).toBeDefined();
      });
    });
  });

  describe('PATCH /subjects/:id', () => {
    it('updates metadata for owner; validates payload; blocks other users', async () => {
      // Sign up two users
      const a = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'patch_a@test.com', password: 'password123' })
        .expect(201);
      const tokenA = a.body.accessToken as string;
      const b = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'patch_b@test.com', password: 'password123' })
        .expect(201);
      const tokenB = b.body.accessToken as string;

      // A creates a subject
      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Chemistry' })
        .expect(201);
      const subjectId = created.body.id as string;

      // Empty payload -> 400
      await request(app.getHttpServer())
        .patch(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({})
        .expect(400);

      // Invalid color -> 400
      await request(app.getHttpServer())
        .patch(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ color: 'not-a-hex' })
        .expect(400);

      // Valid update -> 200
      const res = await request(app.getHttpServer())
        .patch(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Chem I',
          courseCode: 'CHEM 101',
          professorName: 'Dr. Stone',
          ambition: 'Master stoichiometry',
          color: '#4F46E5',
        })
        .expect(200);
      expect(res.body.id).toBe(subjectId);
      expect(res.body.name).toBe('Chem I');
      expect(res.body.courseCode).toBe('CHEM 101');
      expect(res.body.professorName).toBe('Dr. Stone');
      expect(res.body.ambition).toBe('Master stoichiometry');
      expect(res.body.color).toBe('#4F46E5');

      // Other user cannot update -> 404
      await request(app.getHttpServer())
        .patch(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });
  });

  describe('DELETE /subjects/:id', () => {
    it('soft-deletes for owner and filters from lists; blocks other users', async () => {
      // Sign up two users
      const a = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'del_a@test.com', password: 'password123' })
        .expect(201);
      const tokenA = a.body.accessToken as string;
      const b = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'del_b@test.com', password: 'password123' })
        .expect(201);
      const tokenB = b.body.accessToken as string;

      // A creates a subject
      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'History' })
        .expect(201);
      const subjectId = created.body.id as string;

      // B attempts to delete A's subject -> 404
      await request(app.getHttpServer())
        .delete(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      // A deletes -> 204
      await request(app.getHttpServer())
        .delete(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(204);

      // GET by id should 404
      await request(app.getHttpServer())
        .get(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      // List should not include archived subject
      const listAfter = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      const arr = listAfter.body as Array<{ id: string }>;
      expect(arr.find((s) => s.id === subjectId)).toBeUndefined();

      // DB archivedAt should be set
      const row = await prisma.subject.findUnique({ where: { id: subjectId } });
      expect(row?.archivedAt).toBeTruthy();
    });
  });

  describe('Filtering & State Transitions (recent/starred/archived)', () => {
    let token: string;
    beforeEach(async () => {
      const signup = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'filters@test.com', password: 'password123' })
        .expect(201);
      token = signup.body.accessToken as string;
    });

    it('GET /subjects?filter=recent returns only items from last 14 days', async () => {
      // Create two subjects
      await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fresh' })
        .expect(201);

      const old = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Old' })
        .expect(201);

      // Manually backdate the second subject to 30 days ago
      const prismaSubject = await prisma.subject.update({
        where: { id: old.body.id as string },
        data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });
      expect(prismaSubject.createdAt).toBeTruthy();

      // recent -> should include Fresh, exclude Old
      const res = await request(app.getHttpServer())
        .get('/subjects')
        .query({ filter: 'recent' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body as Array<{ name: string }>).map((s) => s.name);
      expect(names).toContain('Fresh');
      expect(names).not.toContain('Old');
    });

    it('GET /subjects?filter=starred returns only starred subjects', async () => {
      // Create two subjects
      const a = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Alpha' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Beta' })
        .expect(201);

      // Star Alpha
      await request(app.getHttpServer())
        .patch(`/subjects/${a.body.id as string}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ starred: true })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/subjects')
        .query({ filter: 'starred' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body as Array<{ name: string }>).map((s) => s.name);
      expect(names).toContain('Alpha');
      expect(names).not.toContain('Beta');
    });

    it('GET /subjects?filter=archived returns only archived; POST /:id/unarchive moves it back', async () => {
      // Create two subjects
      const arch = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Archive Me' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Keep Me' })
        .expect(201);

      // Archive one
      await request(app.getHttpServer())
        .delete(`/subjects/${arch.body.id as string}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // archived -> only Archive Me
      const archivedList = await request(app.getHttpServer())
        .get('/subjects')
        .query({ filter: 'archived' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const archNames = (archivedList.body as Array<{ name: string }>).map(
        (s) => s.name,
      );
      expect(archNames).toContain('Archive Me');
      expect(archNames).not.toContain('Keep Me');

      // unarchive -> move back
      await request(app.getHttpServer())
        .post(`/subjects/${arch.body.id as string}/unarchive`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // archived -> now empty
      const archivedAfter = await request(app.getHttpServer())
        .get('/subjects')
        .query({ filter: 'archived' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const namesAfter = (archivedAfter.body as Array<{ name: string }>).map(
        (s) => s.name,
      );
      expect(namesAfter).not.toContain('Archive Me');

      // all (default non-archived) should include both
      const all = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const allNames = (all.body as Array<{ name: string }>).map((s) => s.name);
      expect(allNames).toEqual(
        expect.arrayContaining(['Archive Me', 'Keep Me']),
      );
    });
  });

  // --- New: Reindex trigger E2E ---
  describe('POST /subjects/:id/reindex (trigger pipeline)', () => {
    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer())
        .post('/subjects/any/reindex')
        .expect(401);
    });

    it('should return 404 for subject not owned by requester', async () => {
      // user A creates subject
      const a = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'reidx_a@test.com', password: 'password123' })
        .expect(201);
      const tokenA = a.body.accessToken as string;
      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Index Me' })
        .expect(201);
      const subjectId = created.body.id as string;

      // user B attempts to reindex A's subject -> 404
      const b = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'reidx_b@test.com', password: 'password123' })
        .expect(201);
      const tokenB = b.body.accessToken as string;
      await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/reindex`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('should return 202 and publish a reindex job for owned subject', async () => {
      // Spy on queue service publish method
      const queue = app.get(QueueService);
      const spy = jest
        .spyOn(queue, 'publishReindexJob')
        .mockImplementation(() => undefined);

      const user = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'reidx_ok@test.com', password: 'password123' })
        .expect(201);
      const token = user.body.accessToken as string;
      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Owned' })
        .expect(201);
      const subjectId = created.body.id as string;

      const res = await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/reindex`)
        .set('Authorization', `Bearer ${token}`)
        .expect(202);

      expect(res.body).toEqual({ status: 'queued' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ subjectId });
      spy.mockRestore();
    });
  });
});
