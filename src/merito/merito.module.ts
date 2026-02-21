import { Module } from '@nestjs/common';
import { MeritoService } from './merito.service';
import { MeritoController } from './merito.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MeritoService],
  controllers: [MeritoController],
})
export class MeritoModule {}
