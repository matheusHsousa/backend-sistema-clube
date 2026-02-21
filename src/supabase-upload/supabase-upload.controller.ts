import { Controller, Post, UploadedFile, UseInterceptors, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseUploadService } from './supabase-upload.service';

@Controller('upload')
export class SupabaseUploadController {
  constructor(private readonly svc: SupabaseUploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@Body('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!file) throw new BadRequestException('file is required');

    try {
      const url = await this.svc.uploadAvatar(userId, file.buffer, file.originalname, file.mimetype);
      return { url };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('UploadAvatar error:', err);
      throw err;
    }
  }
}
