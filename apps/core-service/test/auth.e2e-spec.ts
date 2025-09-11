/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const password = 'password123';

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
    // Clean user table before tests
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('/auth/signup (POST) - should sign up a new user', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: uniqueEmail,
        password: password,
      })
      .expect(201)
      .then((res) => {
        const body = res.body as unknown as {
          accessToken: string;
          user: { email: string };
        };
        expect(body).toHaveProperty('accessToken');
        expect(body).toHaveProperty('user');
        expect(body.user.email).toBe(uniqueEmail);
      });
  });

  it('/auth/login (POST) - should log in the new user', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: password,
      })
      .expect(200)
      .then((res) => {
        const body = res.body as unknown as { accessToken: string };
        expect(body).toHaveProperty('accessToken');
      });
  });

  it('/auth/login (POST) - should fail to log in with incorrect password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: 'wrongpassword',
      })
      .expect(401);
  });

  it('/auth/signup (POST) - should fail to sign up with an existing email', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: uniqueEmail, // Use the same email again
        password: 'anotherpassword',
      })
      .expect(409); // Conflict
  });
});
