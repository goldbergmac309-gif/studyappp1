/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Workspace (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean non-seeded data before each test (keep Personas)
    await prisma.widgetInstance.deleteMany();
    await prisma.blueprint.deleteMany();
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

  it('GET /workspace/personas should list seeded personas', async () => {
    const res = await request(app.getHttpServer())
      .get('/workspace/personas')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Expect at least our four seeds
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const names = (res.body as Array<{ name: string }>).map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(['STEM Lab', 'Humanities Hub']),
    );
  });

  describe('Protected endpoints authz', () => {
    it('should 401 without JWT', async () => {
      await request(app.getHttpServer())
        .get('/subjects/some/workspace')
        .expect(401);
      await request(app.getHttpServer())
        .post('/subjects/some/apply-persona')
        .send({ personaId: 'x' })
        .expect(401);
      await request(app.getHttpServer())
        .patch('/subjects/some/workspace/layout')
        .send({ widgets: [] })
        .expect(401);
    });
  });

  describe('Happy path + ownership + validation', () => {
    it('should apply persona to owned subject, then read and update layout; block re-apply and enforce ownership', async () => {
      // Sign up User A and B
      const a = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'ws_a@test.com', password: 'password123' })
        .expect(201);
      const tokenA = a.body.accessToken as string;

      const b = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'ws_b@test.com', password: 'password123' })
        .expect(201);
      const tokenB = b.body.accessToken as string;

      // A creates a subject
      const created = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Workspace Subject' })
        .expect(201);
      const subjectId = created.body.id as string;

      // List personas and pick one
      const personasRes = await request(app.getHttpServer())
        .get('/workspace/personas')
        .expect(200);
      expect(personasRes.body.length).toBeGreaterThan(0);
      const personaId = personasRes.body[0].id as string;

      // B tries to apply persona to A's subject -> 404
      await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/apply-persona`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ personaId })
        .expect(404);

      // A applies persona -> 201 and widgets returned
      const applyRes = await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/apply-persona`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ personaId })
        .expect(201);

      const widgets = applyRes.body as Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        size: { width: number; height: number };
      }>;
      expect(Array.isArray(widgets)).toBe(true);
      expect(widgets.length).toBeGreaterThan(0);

      // Re-apply should 409
      await request(app.getHttpServer())
        .post(`/subjects/${subjectId}/apply-persona`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ personaId })
        .expect(409);

      // A can fetch workspace -> 200
      const wsRes = await request(app.getHttpServer())
        .get(`/subjects/${subjectId}/workspace`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(wsRes.body.length).toBe(widgets.length);

      // B cannot access A's workspace -> 404
      await request(app.getHttpServer())
        .get(`/subjects/${subjectId}/workspace`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      // Patch layout for one widget
      const target = widgets[0];
      const newLayout = {
        widgets: [
          {
            id: target.id,
            position: { x: target.position.x + 1, y: target.position.y + 2 },
            size: {
              width: target.size.width + 1,
              height: target.size.height + 1,
            },
          },
        ],
      };

      const patchRes = await request(app.getHttpServer())
        .patch(`/subjects/${subjectId}/workspace/layout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send(newLayout)
        .expect(200);

      // Expect positions/sizes updated in response
      const updated = patchRes.body as Array<{
        id: string;
        position: { x: number; y: number };
        size: { width: number; height: number };
      }>;
      const u = updated.find((w) => w.id === target.id)!;
      expect(u.position.x).toBe(target.position.x + 1);
      expect(u.position.y).toBe(target.position.y + 2);
      expect(u.size.width).toBe(target.size.width + 1);
      expect(u.size.height).toBe(target.size.height + 1);

      // Verify Blueprint layout synced
      const subj = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { activeLayout: true },
      });
      expect(subj?.blueprintId).toBeTruthy();
      const layout = (subj?.activeLayout?.layout ?? []) as Array<any>;
      const layoutEntry = layout.find((w) => w.id === target.id);
      expect(layoutEntry.position.x).toBe(u.position.x);
      expect(layoutEntry.size.width).toBe(u.size.width);

      // Invalid widget id -> 400
      await request(app.getHttpServer())
        .patch(`/subjects/${subjectId}/workspace/layout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          widgets: [
            {
              id: 'nonexistent',
              position: { x: 0, y: 0 },
              size: { width: 1, height: 1 },
            },
          ],
        })
        .expect(400);
    });
  });
});
