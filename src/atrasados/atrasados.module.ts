import { Module } from '@nestjs/common';
import { AtrasadosService } from './atrasados.service';
import { AtrasadosController } from './atrasados.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AtrasadosService],
  controllers: [AtrasadosController],
  exports: [AtrasadosService],
})
export class AtrasadosModule {}
