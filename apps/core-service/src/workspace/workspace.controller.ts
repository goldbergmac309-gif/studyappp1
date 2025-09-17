import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceService } from './workspace.service';
import { ApplyPersonaDto } from './dto/apply-persona.dto';
import { UpdateWorkspaceLayoutDto } from './dto/update-workspace-layout.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';

type AuthRequest = ExpressRequest & { user: { id: string; email: string } };

@Controller()
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  // Public personas list
  @Get('workspace/personas')
  listPersonas() {
    return this.workspace.listPersonas();
  }

  // Apply persona to a subject's canvas
  @UseGuards(JwtAuthGuard)
  @Post('subjects/:id/apply-persona')
  applyPersona(
    @Param('id') subjectId: string,
    @Body() dto: ApplyPersonaDto,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.applyPersona(subjectId, req.user.id, dto.personaId);
  }

  // Get subject workspace widgets
  @UseGuards(JwtAuthGuard)
  @Get('subjects/:id/workspace')
  getWorkspace(@Param('id') subjectId: string, @Request() req: AuthRequest) {
    return this.workspace.getWorkspace(subjectId, req.user.id);
  }

  // Patch layout (positions/sizes only)
  @UseGuards(JwtAuthGuard)
  @Patch('subjects/:id/workspace/layout')
  patchWorkspaceLayout(
    @Param('id') subjectId: string,
    @Body() dto: UpdateWorkspaceLayoutDto,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.patchWorkspaceLayout(
      subjectId,
      req.user.id,
      dto.widgets,
    );
  }

  // --- New: Widget CRUD ---
  @UseGuards(JwtAuthGuard)
  @Post('subjects/:id/widgets')
  createWidget(
    @Param('id') subjectId: string,
    @Body() dto: CreateWidgetDto,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.createWidget(subjectId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('subjects/:id/widgets/:widgetId')
  updateWidget(
    @Param('id') subjectId: string,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.updateWidget(subjectId, req.user.id, widgetId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subjects/:id/widgets/:widgetId')
  deleteWidget(
    @Param('id') subjectId: string,
    @Param('widgetId') widgetId: string,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.deleteWidget(subjectId, req.user.id, widgetId);
  }

  // Board config
  @UseGuards(JwtAuthGuard)
  @Get('subjects/:id/board-config')
  getBoardConfig(@Param('id') subjectId: string, @Request() req: AuthRequest) {
    return this.workspace.getBoardConfig(subjectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('subjects/:id/board-config')
  patchBoardConfig(
    @Param('id') subjectId: string,
    @Body() config: Record<string, unknown>,
    @Request() req: AuthRequest,
  ) {
    return this.workspace.patchBoardConfig(subjectId, req.user.id, config);
  }
}
