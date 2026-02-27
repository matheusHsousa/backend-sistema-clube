import { Module } from '@nestjs/common';
import { DesafiosUnidadesController } from './desafios-unidades.controller';
import { DesafiosUnidadesService } from './desafios-unidades.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [SupabaseModule, AuthModule, PushModule],
  controllers: [DesafiosUnidadesController],
  providers: [DesafiosUnidadesService],
  exports: [DesafiosUnidadesService],
})
export class DesafiosUnidadesModule {}
