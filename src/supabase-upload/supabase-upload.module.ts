import { Module } from '@nestjs/common';
import { SupabaseUploadService } from './supabase-upload.service';
import { SupabaseUploadController } from './supabase-upload.controller';

@Module({
  providers: [SupabaseUploadService],
  controllers: [SupabaseUploadController],
  exports: [SupabaseUploadService],
})
export class SupabaseUploadModule {}
