import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHmac, timingSafeEqual, createHash } from 'crypto';

@Injectable()
export class HmacGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & {
        signedCookies?: Record<string, string>;
        cookies?: Record<string, string>;
        rawBody?: string;
      }
    >();

    const secret = this.config.get<string>('app.internalApiSecret');
    const legacyKey = this.config.get<string>('app.internalApiKey');
    if (!secret && !legacyKey)
      throw new UnauthorizedException('Internal auth not configured');

    const tsHeader = req.header('x-timestamp') || req.header('X-Timestamp');
    const sigHeader = req.header('x-signature') || req.header('X-Signature');
    const bodyHashHeader =
      req.header('x-body-sha256') || req.header('X-Body-SHA256');
    const legacyHeader =
      req.header('x-internal-api-key') || req.header('X-Internal-API-Key');

    // If HMAC headers are missing, allow legacy API key fallback when configured
    if ((!tsHeader || !sigHeader) && legacyKey && legacyHeader === legacyKey) {
      return true;
    }
    if (!tsHeader || !sigHeader)
      throw new UnauthorizedException('Missing signature headers');

    const ts = Number(tsHeader);
    if (!Number.isFinite(ts))
      throw new UnauthorizedException('Invalid timestamp');
    const now = Math.floor(Date.now() / 1000);
    const skew = Math.abs(now - ts);
    if (skew > 30) throw new UnauthorizedException('Request expired');

    const method = (req.method || 'GET').toUpperCase();
    const path = (req.originalUrl || req.url || '').toString();

    let bodyHash = bodyHashHeader || '';
    if (!bodyHash) {
      const bodyStr =
        typeof req.rawBody === 'string'
          ? req.rawBody
          : typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body ?? {});
      bodyHash = createHash('sha256')
        .update(bodyStr || '')
        .digest('hex');
    }

    if (!secret)
      throw new UnauthorizedException('Internal auth not configured');
    const toSign = `${ts}.${method}.${path}.${bodyHash}`;
    const expected = createHmac('sha256', secret).update(toSign).digest('hex');

    const a = Buffer.from(sigHeader, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      // Fallback: accept legacy API key if provided and matches configured key
      if (legacyKey && legacyHeader === legacyKey) {
        return true;
      }
      throw new UnauthorizedException('Invalid signature');
    }
    return true;
  }
}
