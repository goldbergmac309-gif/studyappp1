import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { NotesExtrasController } from './notes.extras.controller';
import { NotesGraphController } from './notes.graph.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotesController, NotesExtrasController, NotesGraphController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
