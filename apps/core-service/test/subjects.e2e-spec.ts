/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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
});
2