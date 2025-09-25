import { defineConfig, devices } from '@playwright/test'

const CORE_PORT = +(process.env.CORE_PORT || 3001)
const USE_MOCK = !!process.env.MOCK_CORE
const USE_PROD = !!process.env.USE_PROD
const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || 'http://localhost:9000'

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  // Auto-start dev servers for tests
  webServer: (() => {
    type WebSrv = { command: string; cwd: string; port: number; reuseExistingServer?: boolean; env?: Record<string, string>; timeout?: number }
    const clientCommand = USE_PROD ? 'sh -c "pnpm build && pnpm start -p 3100"' : 'pnpm dev'
    const servers: WebSrv[] = [
      {
        command: clientCommand,
        cwd: __dirname,
        port: 3100,
        reuseExistingServer: true,
        env: {
          NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
        },
        timeout: 300_000,
      },
    ]
    if (!USE_MOCK) {
      // Ensure Postgres is available (port 5544) via a Docker-managed container
      servers.push({
        command:
          'bash -lc "docker start studyapp-pg-e2e >/dev/null 2>&1 || docker run -d --name studyapp-pg-e2e -p 5544:5432 -e POSTGRES_DB=studyapp_dev -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16"',
        cwd: __dirname,
        port: 5544,
        reuseExistingServer: true,
        timeout: 120_000,
      })

      // If caller chose an alternate MinIO endpoint on :9002, ensure it is running
      if (S3_ENDPOINT.includes('localhost:9002') || S3_ENDPOINT.includes('127.0.0.1:9002')) {
        servers.push({
          command:
            'bash -lc "docker start studyapp-minio-e2e >/dev/null 2>&1 || docker run -d --name studyapp-minio-e2e -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin -p 9002:9000 -p 9003:9001 minio/minio:latest server /data --console-address \":9001\""',
          cwd: __dirname,
          port: 9002,
          reuseExistingServer: true,
          timeout: 120_000,
        })
      }
    }
    if (USE_MOCK) {
      servers.push({
        command: 'node e2e/mocks/mock-core-server.mjs',
        cwd: __dirname,
        port: CORE_PORT,
        reuseExistingServer: true,
        env: { PORT: String(CORE_PORT) },
        timeout: 120_000,
      })
    } else {
      servers.push({
        command: 'pnpm -F core-service start:test',
        cwd: __dirname + '/../core-service',
        port: CORE_PORT,
        reuseExistingServer: false,
        env: {
          // Point core-service EmbeddingService to local embed server
          ORACLE_EMBED_URL: process.env.ORACLE_EMBED_URL || 'http://localhost:8000',
          JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt',
          INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'dev-internal-key',
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5544/studyapp_dev?schema=public',
          AWS_REGION: process.env.AWS_REGION || 'us-east-1',
          AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'studyapp-docs',
          AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
          AWS_S3_FORCE_PATH_STYLE: process.env.AWS_S3_FORCE_PATH_STYLE || 'true',
          AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
          AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
          RABBITMQ_URL: '',
          PORT: String(CORE_PORT),
        },
        timeout: 300_000,
      })
      if (!process.env.SKIP_EMBED) {
        // Start the lightweight FastAPI embed server (requires Python env available)
        servers.push({
          command: 'python -m uvicorn app.embed_server:app --host 0.0.0.0 --port 8000',
          cwd: __dirname + '/../oracle-service',
          port: 8000,
          reuseExistingServer: true,
          timeout: 120_000,
        })
      }
    }
    return servers
  })(),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
