import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { DesbravadoresController } from './desbravadores.controller';
import { DesbravadoresService } from './desbravadores.service';

@Module({
  imports: [SupabaseModule],
  controllers: [DesbravadoresController],
  providers: [DesbravadoresService],
})
export class DesbravadoresModule {}
