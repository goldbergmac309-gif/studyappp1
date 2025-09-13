import { Body, Controller, Get, HttpCode, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import type { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WorkspaceService } from './workspace.service'
import { ApplyPersonaDto } from './dto/apply-persona.dto'
import { UpdateWorkspaceLayoutDto } from './dto/update-workspace-layout.dto'

type AuthRequest = ExpressRequest & { user: { id: string; email: string } }

@Controller()
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  // Public personas list
  @Get('workspace/personas')
  listPersonas() {
    return this.workspace.listPersonas()
  }

  // Apply persona to a subject's canvas
  @UseGuards(JwtAuthGuard)
  @Post('subjects/:id/apply-persona')
  applyPersona(
    @Param('id') subjectId: string,
    @Body() dto: ApplyPersonaDto,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.applyPersona(subjectId, req.user.id, dto.personaId)
  }

  // Get subject workspace widgets
  @UseGuards(JwtAuthGuard)
  @Get('subjects/:id/workspace')
  getWorkspace(@Param('id') subjectId: string, @Request() req: AuthRequest) {
    return this.workspace.getWorkspace(subjectId, req.user.id)
  }

  // Patch layout (positions/sizes only)
  @UseGuards(JwtAuthGuard)
  @Patch('subjects/:id/workspace/layout')
  patchWorkspaceLayout(
    @Param('id') subjectId: string,
    @Body() dto: UpdateWorkspaceLayoutDto,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.patchWorkspaceLayout(subjectId, req.user.id, dto.widgets)
  }
}
