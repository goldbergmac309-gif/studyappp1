/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 1 - Full User Journey (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean the database before each test
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should complete the full user journey: Alice and Bob data isolation', async () => {
    // Step 1: [Signup] Create a brand-new user, "Alice," via the /auth/signup endpoint
    const aliceSignupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'alice@example.com',
        password: 'securepassword123',
      })
      .expect(201);

    expect(aliceSignupResponse.body).toHaveProperty('accessToken');
    expect(aliceSignupResponse.body).toHaveProperty('user');
    expect(aliceSignupResponse.body.user.email).toBe('alice@example.com');

    const aliceToken = aliceSignupResponse.body.accessToken;

    // Step 2: [Initial State Verification] Using Alice's token, GET /subjects should return empty array
    const aliceInitialSubjects = await request(app.getHttpServer())
      .get('/subjects')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(aliceInitialSubjects.body).toEqual([]);

    // Step 3: [Creation] Using Alice's token, create first subject "Advanced Thermodynamics"
    const aliceFirstSubject = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Advanced Thermodynamics',
      })
      .expect(201);

    expect(aliceFirstSubject.body).toHaveProperty('id');
    expect(aliceFirstSubject.body.name).toBe('Advanced Thermodynamics');
    expect(aliceFirstSubject.body).toHaveProperty('userId');

    // Step 4: [Second Creation] Using Alice's token, create second subject "Quantum Electrodynamics"
    const aliceSecondSubject = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Quantum Electrodynamics',
      })
      .expect(201);

    expect(aliceSecondSubject.body).toHaveProperty('id');
    expect(aliceSecondSubject.body.name).toBe('Quantum Electrodynamics');
    expect(aliceSecondSubject.body).toHaveProperty('userId');

    // Step 5: [List Verification] Using Alice's token, GET /subjects should return exactly two subjects
    const aliceSubjectsAfterCreation = await request(app.getHttpServer())
      .get('/subjects')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(aliceSubjectsAfterCreation.body).toHaveLength(2);

    // Verify the names match (order may vary due to createdAt desc ordering)
    const subjectNames = aliceSubjectsAfterCreation.body.map(
      (subject: any) => subject.name,
    );
    expect(subjectNames).toContain('Advanced Thermodynamics');
    expect(subjectNames).toContain('Quantum Electrodynamics');

    // Step 6: [Logout/Login Cycle] Create a second user, "Bob," and log him in
    const bobSignupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'bob@example.com',
        password: 'anothersecurepassword456',
      })
      .expect(201);

    expect(bobSignupResponse.body).toHaveProperty('accessToken');
    expect(bobSignupResponse.body).toHaveProperty('user');
    expect(bobSignupResponse.body.user.email).toBe('bob@example.com');

    const bobToken = bobSignupResponse.body.accessToken;

    // Step 7: [Bob's Initial State] Using Bob's token, GET /subjects should return empty array
    const bobInitialSubjects = await request(app.getHttpServer())
      .get('/subjects')
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);

    expect(bobInitialSubjects.body).toEqual([]);

    // Step 8: [Final Login] Log back in as Alice and verify her subjects are still there
    const aliceLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'securepassword123',
      })
      .expect(200);

    expect(aliceLoginResponse.body).toHaveProperty('accessToken');
    expect(aliceLoginResponse.body.user.email).toBe('alice@example.com');

    const aliceNewToken = aliceLoginResponse.body.accessToken;

    // Final verification: Alice's subjects are still there
    const aliceFinalSubjects = await request(app.getHttpServer())
      .get('/subjects')
      .set('Authorization', `Bearer ${aliceNewToken}`)
      .expect(200);

    expect(aliceFinalSubjects.body).toHaveLength(2);

    const finalSubjectNames = aliceFinalSubjects.body.map(
      (subject: any) => subject.name,
    );
    expect(finalSubjectNames).toContain('Advanced Thermodynamics');
    expect(finalSubjectNames).toContain('Quantum Electrodynamics');
  });
});
