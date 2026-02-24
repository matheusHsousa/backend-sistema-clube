import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors, Body, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { SupabaseUploadService } from './supabase-upload.service';
import { TextosBiblicosService } from '../textos-biblicos/textos-biblicos.service';

@Controller('upload')
export class SupabaseUploadController {
  private readonly logger = new Logger(SupabaseUploadController.name);

  constructor(private readonly svc: SupabaseUploadService, private readonly textosSvc: TextosBiblicosService) {}

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

  @Post('texto')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadTexto(
    @Body('atrasadoId') atrasadoId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!atrasadoId) throw new BadRequestException('atrasadoId is required');
    const file = Array.isArray(files) && files.length > 0 ? files[0] : undefined;
    if (!file) throw new BadRequestException('file is required');

    const reqId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      const url = await this.svc.uploadTexto(atrasadoId, file.buffer, file.originalname, file.mimetype);
      
      if (!url) throw new BadRequestException('Upload failed');

      const record = await this.textosSvc.enviarTexto(Number(atrasadoId), url);
      return { url, record };
    } catch (err) {
      this.logger.error(`uploadTexto error req=${reqId}`, err as any);
      throw err;
    }
  }
}
