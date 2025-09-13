import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, WidgetInstance } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

const VALID_WIDGET_TYPES = new Set(['NOTES', 'MIND_MAP', 'FLASHCARDS'])

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async listPersonas(): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.prisma.persona.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    return rows
  }

  async applyPersona(subjectId: string, userId: string, personaId: string): Promise<WidgetInstance[]> {
    if (!personaId) {
      throw new BadRequestException('personaId is required')
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true, name: true, userId: true, blueprintId: true },
    })
    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    const persona = await this.prisma.persona.findUnique({ where: { id: personaId } })
    if (!persona) {
      throw new BadRequestException('Persona not found')
    }

    const existingCount = await this.prisma.widgetInstance.count({ where: { subjectId } })
    if (subject.blueprintId || existingCount > 0) {
      throw new ConflictException('Workspace already initialized for this subject')
    }

    const widgetsProto = (persona.widgets as Prisma.JsonValue) as Array<any>
    if (!Array.isArray(widgetsProto)) {
      throw new BadRequestException('Persona widgets are malformed')
    }

    // Validate proto entries
    for (const w of widgetsProto) {
      if (!w || typeof w !== 'object') throw new BadRequestException('Persona widget entry invalid')
      if (!VALID_WIDGET_TYPES.has(w.type)) throw new BadRequestException(`Invalid widget type: ${String(w.type)}`)
      if (!w.position || typeof w.position.x !== 'number' || typeof w.position.y !== 'number') {
        throw new BadRequestException('Widget position invalid')
      }
      if (!w.size || typeof w.size.width !== 'number' || typeof w.size.height !== 'number') {
        throw new BadRequestException('Widget size invalid')
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create a blueprint first with temporary empty layout to satisfy schema
      const now = new Date().toISOString()
      const blueprintName = `${subject.name} • ${persona.name} • ${now}`
      const blueprint = await tx.blueprint.create({
        data: {
          userId: userId,
          name: blueprintName,
          layout: [],
        },
      })

      // Create widget instances
      const created: WidgetInstance[] = []
      for (const w of widgetsProto) {
        const row = await tx.widgetInstance.create({
          data: {
            subjectId,
            type: w.type,
            position: w.position as Prisma.InputJsonValue,
            size: w.size as Prisma.InputJsonValue,
            content: (w.content ?? {}) as Prisma.InputJsonValue,
          },
        })
        created.push(row)
      }

      // Attach blueprint to subject
      await tx.subject.update({ where: { id: subjectId }, data: { blueprintId: blueprint.id } })

      // Sync blueprint layout with created widgets (ids known now)
      const layout = created.map((w) => ({ id: w.id, position: w.position, size: w.size }))
      await tx.blueprint.update({ where: { id: blueprint.id }, data: { layout: layout as Prisma.InputJsonValue } })

      return created
    })

    return result
  }

  async getWorkspace(subjectId: string, userId: string): Promise<WidgetInstance[]> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    })
    if (!subject) throw new NotFoundException('Subject not found')

    const widgets = await this.prisma.widgetInstance.findMany({ where: { subjectId }, orderBy: { id: 'asc' } })
    return widgets
  }

  async patchWorkspaceLayout(
    subjectId: string,
    userId: string,
    widgets: Array<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>,
  ): Promise<WidgetInstance[]> {
    if (!widgets || widgets.length === 0) throw new BadRequestException('widgets array is required')

    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true, blueprintId: true },
    })
    if (!subject) throw new NotFoundException('Subject not found')

    const ids = widgets.map((w) => w.id)
    const count = await this.prisma.widgetInstance.count({ where: { id: { in: ids }, subjectId } })
    if (count !== ids.length) throw new BadRequestException('One or more widget ids are invalid for this subject')

    await this.prisma.$transaction(async (tx) => {
      for (const w of widgets) {
        await tx.widgetInstance.update({
          where: { id: w.id },
          data: {
            position: (w.position as unknown) as Prisma.InputJsonValue,
            size: (w.size as unknown) as Prisma.InputJsonValue,
          },
        })
      }

      // Sync blueprint layout with current full set
      if (subject.blueprintId) {
        const all = await tx.widgetInstance.findMany({ where: { subjectId }, select: { id: true, position: true, size: true } })
        const layout = all.map((w) => ({ id: w.id, position: w.position, size: w.size }))
        await tx.blueprint.update({ where: { id: subject.blueprintId }, data: { layout: layout as Prisma.InputJsonValue } })
      }
    })

    // Return the latest full set
    return this.prisma.widgetInstance.findMany({ where: { subjectId }, orderBy: { id: 'asc' } })
  }
}
