import { Module } from '@nestjs/common';
import { TextosBiblicosController } from './textos-biblicos.controller';
import { TextosBiblicosService } from './textos-biblicos.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [TextosBiblicosController],
  providers: [TextosBiblicosService],
  exports: [TextosBiblicosService],
})
export class TextosBiblicosModule {}
