import { ConfigService } from '@nestjs/config';
import { assertProductionSecrets } from './startup-guard';

type SecretMap = Partial<{
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  REFRESH_TOKEN_PEPPER: string;
  INTERNAL_API_SECRET: string;
}>;

describe('assertProductionSecrets', () => {
  function makeConfig(nodeEnv: string, secrets: SecretMap = {}): ConfigService {
    const values: Record<string, string | undefined> = {
      'app.nodeEnv': nodeEnv,
      'app.jwtSecret': secrets.JWT_SECRET,
      'app.cookieSecret': secrets.COOKIE_SECRET,
      'app.refreshTokenPepper': secrets.REFRESH_TOKEN_PEPPER,
      'app.internalApiSecret': secrets.INTERNAL_API_SECRET,
    };
    const cfg = {
      get: <T = string>(key: string): T | undefined => values[key] as T,
    };
    return cfg as unknown as ConfigService;
  }

  it('does not throw in development even with weak or missing secrets', () => {
    const config = makeConfig('development', {
      JWT_SECRET: 'default',
      COOKIE_SECRET: '',
      REFRESH_TOKEN_PEPPER: undefined as unknown as string,
      INTERNAL_API_SECRET: 'ci-internal',
    });
    expect(() => assertProductionSecrets(config)).not.toThrow();
  });

  it('throws in production when a secret is missing or weak', () => {
    const config = makeConfig('production', {
      JWT_SECRET: 'default', // weak denylisted value
      COOKIE_SECRET: 'changeme', // weak denylisted value
      REFRESH_TOKEN_PEPPER: '', // missing/empty
      INTERNAL_API_SECRET: 'ci-internal', // weak denylisted value
    });
    expect(() => assertProductionSecrets(config)).toThrow(Error);
    try {
      assertProductionSecrets(config);
    } catch (e) {
      let msg = '';
      if (e instanceof Error) msg = e.message;
      else msg = String(e);
      expect(msg).toContain('JWT_SECRET');
      expect(msg).toContain('COOKIE_SECRET');
      expect(msg).toContain('REFRESH_TOKEN_PEPPER');
      expect(msg).toContain('INTERNAL_API_SECRET');
    }
  });

  it('does not throw in production when all secrets are strong', () => {
    const config = makeConfig('production', {
      JWT_SECRET: 's3cure-jwt-XYZ-123',
      COOKIE_SECRET: 'cookiesecret-ABC-789',
      REFRESH_TOKEN_PEPPER: 'pepper-strong-456',
      INTERNAL_API_SECRET: 'hmac-secret-strong-000',
    });
    expect(() => assertProductionSecrets(config)).not.toThrow();
  });
});
