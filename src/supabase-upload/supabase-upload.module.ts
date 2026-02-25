import { Module } from '@nestjs/common';
import { SupabaseUploadService } from './supabase-upload.service';
import { SupabaseUploadController } from './supabase-upload.controller';
import { TextosBiblicosModule } from '../textos-biblicos/textos-biblicos.module';
import { DesafiosUnidadesModule } from '../desafios-unidades/desafios-unidades.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TextosBiblicosModule, DesafiosUnidadesModule, AuthModule],
  providers: [SupabaseUploadService],
  controllers: [SupabaseUploadController],
  exports: [SupabaseUploadService],
})
export class SupabaseUploadModule {}
