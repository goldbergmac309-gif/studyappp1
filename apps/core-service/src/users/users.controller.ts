import { Controller, Post, UseGuards, Request, HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request as ExpressRequest } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('@me/consent-ai')
  @HttpCode(200)
  async consentAi(
    @Request() req: ExpressRequest & { user: { id: string; email: string } },
  ) {
    // Set consent flag and return minimal user payload for client sync
    const updated = await this.usersService.consentToAi(req.user.id);
    return updated; // { id, email, hasConsentedToAi }
  }
}
