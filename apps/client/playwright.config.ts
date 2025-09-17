import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
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
  webServer: [
    {
      command: 'pnpm dev',
      cwd: __dirname,
      port: 3100,
      reuseExistingServer: true,
      env: {
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
      },
      timeout: 120_000,
    },
    {
      command: 'pnpm -F core-service start:test',
      cwd: __dirname + '/../core-service',
      port: +(process.env.CORE_PORT || 3001),
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
        PORT: process.env.CORE_PORT || '3001',
      },
      timeout: 120_000,
    },
    // Start the lightweight FastAPI embed server (requires Python env available)
    {
      command: 'python -m uvicorn app.embed_server:app --host 0.0.0.0 --port 8000',
      cwd: __dirname + '/../oracle-service',
      port: 8000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
