import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Subject } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createSubjectDto: CreateSubjectDto, userId: string): Promise<Subject> {
    return this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        userId,
      },
    });
  }

  async findAllByUser(userId: string): Promise<Subject[]> {
    return this.prisma.subject.findMany({
      where: {
        userId,
        archivedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(id: string, userId: string): Promise<Subject | null> {
    return this.prisma.subject.findFirst({
      where: { id, userId, archivedAt: null },
    });
  }

  async updateSubject(
    userId: string,
    subjectId: string,
    dto: UpdateSubjectDto,
  ): Promise<Subject> {
    const exists = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Subject not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.courseCode !== undefined) data.courseCode = dto.courseCode;
    if (dto.professorName !== undefined) data.professorName = dto.professorName;
    if (dto.ambition !== undefined) data.ambition = dto.ambition;
    if (dto.color !== undefined) data.color = dto.color;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data,
    });
  }

  async archiveSubject(userId: string, subjectId: string): Promise<void> {
    const exists = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Subject not found');
    }

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { archivedAt: new Date() },
    });
  }
}
