import { Module } from '@nestjs/common';
import { DesafiosUnidadesController } from './desafios-unidades.controller';
import { DesafiosUnidadesService } from './desafios-unidades.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [DesafiosUnidadesController],
  providers: [DesafiosUnidadesService],
  exports: [DesafiosUnidadesService],
})
export class DesafiosUnidadesModule {}
