import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { DesbravadoresController } from './desbravadores.controller';
import { DesbravadoresService } from './desbravadores.service';

@Module({
  imports: [PrismaModule],
  controllers: [DesbravadoresController],
  providers: [DesbravadoresService],
})
export class DesbravadoresModule {}
