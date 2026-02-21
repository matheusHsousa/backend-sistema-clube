import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DesbravadoresModule } from './desbravadores/desbravadores.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { PointsModule } from './points/points.module';
import { StatsModule } from './stats/stats.module';
import { AtrasadosModule } from './atrasados/atrasados.module';
import { TextosBiblicosModule } from './textos-biblicos/textos-biblicos.module';
import { SupabaseUploadModule } from './supabase-upload/supabase-upload.module';
import { MeritoModule } from './merito/merito.module';

@Module({
  imports: [AuthModule, PrismaModule, DesbravadoresModule, UsersModule, ClassesModule, PointsModule, StatsModule, AtrasadosModule, TextosBiblicosModule, SupabaseUploadModule, MeritoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
