/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

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

    // Enable cookie parsing for refresh-token endpoint
    app.use((cookieParser as unknown as (secret?: string) => any)());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

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
        // assert refresh cookie present with HttpOnly and SameSite=Strict
        const sc = res.header['set-cookie'];
        const setCookie = Array.isArray(sc)
          ? sc
          : typeof sc === 'string'
            ? [sc]
            : [];
        expect(Array.isArray(setCookie)).toBe(true);
        const cookieStr = setCookie.join(';');
        expect(cookieStr).toContain('rt=');
        expect(cookieStr.toLowerCase()).toContain('httponly');
        expect(cookieStr.toLowerCase()).toContain('samesite=strict');
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

  it('/auth/refresh-token (POST) - returns new accessToken when cookie is present', async () => {
    const agent = request.agent(app.getHttpServer());
    // First, login to establish refresh cookie
    const loginRes = await agent
      .post('/auth/login')
      .send({ email: uniqueEmail, password })
      .expect(200);
    const firstAccess = (loginRes.body as { accessToken?: string }).accessToken;
    expect(typeof firstAccess).toBe('string');

    // Now call refresh-token using the same agent (cookies preserved)
    const refreshRes = await agent
      .post('/auth/refresh-token')
      .send({})
      .expect(200);
    const refreshed = refreshRes.body as { accessToken?: string };
    expect(typeof refreshed.accessToken).toBe('string');
    expect(refreshed.accessToken).not.toBe(firstAccess);
  });

  it('/auth/login (POST) - should fail to log in with incorrect password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: 'wrongpassword',
      })
      .expect(401)
      .then((res) => {
        const body = res.body as {
          statusCode: number;
          message: string;
          error?: string;
          timestamp: string;
        };
        expect(body).toHaveProperty('statusCode', 401);
        expect(typeof body.message).toBe('string');
        expect(typeof body.timestamp).toBe('string');
      });
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
