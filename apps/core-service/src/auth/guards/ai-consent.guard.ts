import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AiConsentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { hasConsentedToAi?: boolean } }>();
    const has = Boolean(req.user && req.user.hasConsentedToAi);
    if (!has) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AI_CONSENT_REQUIRED',
        message: 'AI consent is required to use this feature.',
      });
    }
    return true;
  }
}
