import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createSubjectDto: CreateSubjectDto, userId: string) {
    return this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.subject.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(id: string, userId: string) {
    return this.prisma.subject.findFirst({
      where: { id, userId },
    });
  }
}
