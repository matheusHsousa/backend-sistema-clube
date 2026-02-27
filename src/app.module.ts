import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DesbravadoresModule } from './desbravadores/desbravadores.module';
import { SupabaseModule } from './supabase/supabase.module';
import { DesafiosUnidadesModule } from './desafios-unidades/desafios-unidades.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { PointsModule } from './points/points.module';
import { StatsModule } from './stats/stats.module';
import { AtrasadosModule } from './atrasados/atrasados.module';
import { TextosBiblicosModule } from './textos-biblicos/textos-biblicos.module';
import { SupabaseUploadModule } from './supabase-upload/supabase-upload.module';
import { PushModule } from './push/push.module';
import { MeritoModule } from './merito/merito.module';

@Module({
  imports: [AuthModule, SupabaseModule, DesafiosUnidadesModule, DesbravadoresModule, UsersModule, ClassesModule, PointsModule, StatsModule, AtrasadosModule, TextosBiblicosModule, SupabaseUploadModule, MeritoModule, PushModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
