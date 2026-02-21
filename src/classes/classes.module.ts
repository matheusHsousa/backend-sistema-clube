import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [PrismaModule],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
