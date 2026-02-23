import { Module } from '@nestjs/common';
import { MeritoService } from './merito.service';
import { MeritoController } from './merito.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [MeritoService],
  controllers: [MeritoController],
})
export class MeritoModule {}
