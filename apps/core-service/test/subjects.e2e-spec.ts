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

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Unauthorized Access Tests', () => {
    it('should return 401 for GET /subjects without JWT token', () => {
      return request(app.getHttpServer())
        .get('/subjects')
        .expect(401);
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
      expect(userBSubjectsResponse.body.find((s: any) => s.name === 'Subject A')).toBeUndefined();

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
      
      const subjectNames = allSubjectsResponse.body.map((s: any) => s.name);
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
});
