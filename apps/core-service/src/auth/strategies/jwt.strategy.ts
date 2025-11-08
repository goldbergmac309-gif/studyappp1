/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const auth = req.headers?.authorization;
        if (!auth) return null;
        const [scheme, token] = auth.split(' ');
        if (!token || scheme?.toLowerCase() !== 'bearer') return null;
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwtSecret'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // Attach minimal, fresh user state to request, including consent flag.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, hasConsentedToAi: true },
    });
    // If user is missing (deleted), fall back to payload to avoid leaking details
    if (!user)
      return {
        id: payload.sub,
        email: payload.email,
        hasConsentedToAi: false,
      } as {
        id: string;
        email: string;
        hasConsentedToAi: boolean;
      };
    return {
      id: user.id,
      email: user.email,
      hasConsentedToAi: Boolean(user.hasConsentedToAi),
    };
  }
}
