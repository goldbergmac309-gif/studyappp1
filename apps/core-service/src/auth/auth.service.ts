import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../users/dto/create-user.dto';

export interface AuthUserDto {
  id: string;
  email: string;
  hasConsentedToAi: boolean;
}

export interface AuthLoginResult {
  accessToken: string;
  refreshToken: string; // not returned to client; controller sets cookie and strips
  user: AuthUserDto;
}

export interface AuthRefreshResult {
  accessToken: string;
  user: AuthUserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<{ id: string; email: string; hasConsentedToAi: boolean } | null> {
    const user = await this.usersService.findOne(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const has = Boolean(
        (user as unknown as { hasConsentedToAi?: boolean })?.hasConsentedToAi,
      );
      return {
        id: user.id,
        email: user.email,
        hasConsentedToAi: has,
      };
    }
    return null;
  }

  private mintAccessToken(user: { id: string; email: string }) {
    const payload = {
      email: user.email,
      sub: user.id,
      // unique token id to avoid identical JWTs within the same second
      jti: randomBytes(8).toString('hex'),
    } as const;
    return this.jwtService.signAsync(payload);
  }

  private generateRefreshToken(): string {
    // 256-bit random token, base64url encoded
    return randomBytes(32).toString('base64url');
  }

  private hashRefreshToken(token: string): string {
    const pepper = this.config.get<string>('app.refreshTokenPepper') || '';
    return createHash('sha256').update(`${pepper}${token}`).digest('hex');
  }

  async login(user: {
    id: string;
    email: string;
    hasConsentedToAi?: boolean;
  }): Promise<AuthLoginResult> {
    const refreshToken = this.generateRefreshToken();
    const hash = this.hashRefreshToken(refreshToken);
    await this.usersService.setRefreshTokenHash(user.id, hash);

    const accessToken = await this.mintAccessToken({
      id: user.id,
      email: user.email,
    });
    return {
      accessToken,
      refreshToken, // controller will set httpOnly cookie; do not return to client body
      user: {
        id: user.id,
        email: user.email,
        hasConsentedToAi: Boolean(user.hasConsentedToAi),
      },
    } as const;
  }

  async signup(createUserDto: CreateUserDto): Promise<AuthLoginResult> {
    const user = await this.usersService.create(createUserDto);
    // New accounts have not consented yet
    return this.login({
      id: user.id,
      email: user.email,
      hasConsentedToAi: false,
    });
  }

  async refreshFromToken(refreshToken: string): Promise<AuthRefreshResult> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const hash = this.hashRefreshToken(refreshToken);
    const user = await this.usersService.findByRefreshTokenHash(hash);
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const accessToken = await this.mintAccessToken({
      id: user.id,
      email: user.email,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        hasConsentedToAi: Boolean(
          (user as unknown as { hasConsentedToAi?: boolean })?.hasConsentedToAi,
        ),
      },
    } as const;
  }
}
