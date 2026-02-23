import { Module } from '@nestjs/common';
import { AtrasadosService } from './atrasados.service';
import { AtrasadosController } from './atrasados.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  providers: [AtrasadosService],
  controllers: [AtrasadosController],
  exports: [AtrasadosService],
})
export class AtrasadosModule {}
