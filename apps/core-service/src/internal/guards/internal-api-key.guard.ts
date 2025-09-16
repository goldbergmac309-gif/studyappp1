import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('x-internal-api-key');
    const appCfg = this.config.get<{ internalApiKey?: string }>('app');

    if (!appCfg?.internalApiKey || apiKey !== appCfg.internalApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}
