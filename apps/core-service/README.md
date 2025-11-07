<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Environment Variables

Set the following variables (e.g., in `.env`) for local development. CI will inject required secrets as needed.

```bash
# Core
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/studyapp_dev?schema=public"  # PostgreSQL local dev
JWT_SECRET=your-jwt-secret

# S3
AWS_REGION=your-aws-region
AWS_S3_BUCKET=your-bucket-name
# Optional for S3-compatible endpoints (e.g., MinIO)
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Internal API key for oracle callback
INTERNAL_API_KEY=dev-internal-key

# Upload constraints (bytes; default 20MB)
UPLOAD_MAX_FILE_SIZE_BYTES=20971520

# ClamAV (Malware Scanning)
# Enable to require live scanning via clamd. In tests, scanning is disabled by default.
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_CONNECT_TIMEOUT_MS=3000
CLAMAV_READ_TIMEOUT_MS=10000
```

## Health Endpoints

This service exposes Kubernetes-friendly health endpoints using `@nestjs/terminus`:

- Liveness: `GET /health/live` — returns `200 OK` if the process is responsive.
- Readiness: `GET /health/ready` — returns `200 OK` when dependencies are healthy; otherwise `503 Service Unavailable`.

Readiness checks include:

- Database (Prisma/SQL)
- RabbitMQ queue availability (optional if not configured)
- S3 bucket accessibility (optional if not configured)
- ClamAV daemon connectivity (optional if disabled)

Example responses:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "queue": { "status": "up" },
    "s3": { "status": "up" }
  }
}
```

When degraded, the endpoint responds with HTTP 503 and a body describing failing indicators.

## Malware Scanning (ClamAV)

Core-Service performs server-side malware scanning on uploads before S3 persistence or job enqueue. It uses the `clamd` daemon via the `clamscan` Node client.

- Runtime config lives in `src/config/configuration.ts` (`app.clamav` group)
- Upload path integrates scanner in `src/documents/documents.service.ts`
- Readiness includes ClamAV via `GET /health/ready` when enabled

Local stack (docker-compose) includes a `clamav` service exposing port `3310`.

Quick verification with EICAR (safe test string):

```bash
# 1) Start dependencies via docker-compose (clamav, postgres, rabbitmq, minio)
# 2) Run core-service locally with CLAMAV_ENABLED=true

EICAR='X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
printf %s "$EICAR" > /tmp/eicar.txt

# Signup -> get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"eicar@test.com","password":"password123"}' | jq -r .accessToken)

# Create subject
SUBJECT=$(curl -s -X POST http://localhost:3000/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Security"}' | jq -r .id)

# Attempt upload of EICAR -> expect HTTP 400
curl -i -X POST http://localhost:3000/subjects/$SUBJECT/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F file=@/tmp/eicar.txt
```

## Upload Allowlist & Security

Uploads are constrained to a conservative MIME/extension allowlist to reduce risk and improve processing reliability. Unsupported types return HTTP 415 without creating a `Document` or touching S3/Queue.

Allowed:

- PDF (`application/pdf`, `.pdf`)
- Plain text (`text/plain`, `.txt`)
- Markdown (`text/markdown`, `.md`)
- Word documents (`.docx`, `.doc`)

All accepted uploads are scanned for malware prior to S3 persistence and job enqueue. The scanner follows a fail-closed policy.

## Insight Sessions: Server-Sent Events (SSE)

Core-service exposes an SSE endpoint that streams real-time status of an Insight Session until completion.

- Create session: `POST /subjects/:subjectId/insight-sessions`
- Get session: `GET /insight-sessions/:sessionId`
- Stream updates: `GET /insight-sessions/:sessionId/stream`

The SSE endpoint requires JWT and emits `text/event-stream` messages carrying the session JSON (status: `PENDING|READY|FAILED`). Clients should close the stream when a terminal status is observed.

Client convenience helper is available in `apps/client/src/lib/api.ts` as `streamInsightSession(sessionId, handlers)`.

## Documents: Presigned URL (Preview/Download)

A thin endpoint returns a short-lived presigned URL for document download/preview. Ownership is enforced via JWT.

```
GET /documents/:id/url   # { url: string }
```

The URL is generated on-demand from the configured S3 bucket and expires shortly (default 5 minutes). Intended for future viewer integrations.

## Provider Toggles & Consent (See oracle-service)

Embedding/LLM provider selection and consent gating are controlled in oracle-service. Refer to `apps/oracle-service/README.md` for:

- `ENGINE_PROVIDER`, `ENGINE_MODEL_NAME`, `ENGINE_DIM` (1536 default)
- Consent gating via `AI_CONSENT=true` and `OPENAI_API_KEY`
- `ENABLE_META_CALLBACK` to post structural metadata (language, headings, detected type)

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
