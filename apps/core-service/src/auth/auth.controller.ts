import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService, type AuthLoginResult } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: ExpressResponse, token: string) {
    const isProd =
      (this.config.get<string>('app.nodeEnv') || 'development') ===
      'production';
    const maxAgeDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
    res.cookie('rt', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
      // Sign only in production; in tests/dev we avoid signed cookies to simplify setup
      signed: isProd,
    });
  }

  @Post('signup')
  async signup(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const result: AuthLoginResult =
      await this.authService.signup(createUserDto);
    // Set refresh cookie and strip from body
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: ExpressRequest & { user: { id: string; email: string } },
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const result: AuthLoginResult = await this.authService.login(req.user);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: ExpressRequest) {
    const r = req as ExpressRequest & {
      signedCookies?: Record<string, string>;
      cookies?: Record<string, string>;
    };
    let token: string | undefined;
    if (r.signedCookies && typeof r.signedCookies === 'object') {
      const v = (r.signedCookies as Record<string, unknown>)['rt'];
      if (typeof v === 'string') token = v;
    }
    if (!token && r.cookies && typeof r.cookies === 'object') {
      const v = (r.cookies as Record<string, unknown>)['rt'];
      if (typeof v === 'string') token = v;
    }
    if (!token) throw new UnauthorizedException('Missing refresh token');
    const result = await this.authService.refreshFromToken(token);
    // Do NOT rotate or re-issue refresh token per spec
    return result;
  }
}
