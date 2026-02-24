import { Module } from '@nestjs/common';
import { SupabaseUploadService } from './supabase-upload.service';
import { SupabaseUploadController } from './supabase-upload.controller';
import { TextosBiblicosModule } from '../textos-biblicos/textos-biblicos.module';

@Module({
  imports: [TextosBiblicosModule],
  providers: [SupabaseUploadService],
  controllers: [SupabaseUploadController],
  exports: [SupabaseUploadService],
})
export class SupabaseUploadModule {}
