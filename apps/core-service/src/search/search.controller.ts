import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import type { GlobalSearchResponse } from '@studyapp/shared-types';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Request() req: ExpressRequest & { user: { id: string; email: string } },
    @Query() dto: SearchQueryDto,
  ): Promise<GlobalSearchResponse> {
    const userId = req.user.id;
    return this.searchService.performGlobalSearch(userId, dto);
  }
}
