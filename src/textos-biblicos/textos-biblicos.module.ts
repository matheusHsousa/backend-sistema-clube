import { Module } from '@nestjs/common';
import { TextosBiblicosController } from './textos-biblicos.controller';
import { TextosBiblicosService } from './textos-biblicos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TextosBiblicosController],
  providers: [TextosBiblicosService],
  exports: [TextosBiblicosService],
})
export class TextosBiblicosModule {}
