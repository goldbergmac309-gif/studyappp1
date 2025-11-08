import { ConfigService } from '@nestjs/config';

const WEAK_DEFAULTS = new Set<string>([
  'default',
  'changeme',
  'password',
  'secret',
  'insecure',
  'test',
  'dev',
  'ci-jwt',
  'ci-internal',
]);

function isWeak(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const v = value.trim();
  if (!v) return true;
  return WEAK_DEFAULTS.has(v.toLowerCase());
}

export function assertProductionSecrets(config: ConfigService): void {
  const nodeEnv = (
    config.get<string>('app.nodeEnv') || 'development'
  ).toLowerCase();
  if (nodeEnv !== 'production') return;

  const checks: Array<{ name: string; value?: string }> = [
    { name: 'JWT_SECRET', value: config.get<string>('app.jwtSecret') },
    { name: 'COOKIE_SECRET', value: config.get<string>('app.cookieSecret') },
    {
      name: 'REFRESH_TOKEN_PEPPER',
      value: config.get<string>('app.refreshTokenPepper'),
    },
    {
      name: 'INTERNAL_API_SECRET',
      value: config.get<string>('app.internalApiSecret'),
    },
  ];

  const failures = checks
    .filter(({ value }) => isWeak(value))
    .map(({ name }) => name);

  if (failures.length > 0) {
    throw new Error(
      `[StartupGuard] Insecure production configuration: ${failures.join(', ')} are weak or missing.`,
    );
  }
}
