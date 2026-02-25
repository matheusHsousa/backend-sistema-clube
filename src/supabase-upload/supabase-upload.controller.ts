import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors, Body, BadRequestException, Logger, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { SupabaseUploadService } from './supabase-upload.service';
import { TextosBiblicosService } from '../textos-biblicos/textos-biblicos.service';
import { DesafiosUnidadesService } from '../desafios-unidades/desafios-unidades.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('upload')
export class SupabaseUploadController {
  private readonly logger = new Logger(SupabaseUploadController.name);

  constructor(
    private readonly svc: SupabaseUploadService,
    private readonly textosSvc: TextosBiblicosService,
    private readonly desafiosSvc: DesafiosUnidadesService,
  ) {}

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

  @Post('desafio')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('CONSELHEIRO', 'ADMIN')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadDesafio(
    @Body('challengeId') challengeId: string,
    @Body('unitId') unitId: string,
    @Body('comment') comment: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!challengeId) throw new BadRequestException('challengeId is required');
    const file = Array.isArray(files) && files.length > 0 ? files[0] : undefined;
    if (!file) throw new BadRequestException('file is required');

    const reqId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      const url = await this.svc.uploadDesafio(challengeId, file.buffer, file.originalname, file.mimetype);
      if (!url) throw new BadRequestException('Upload failed');

      // determine unit from body or authenticated user
      const unidade = unitId ?? req.user?.unidade ?? null;

      const payload: any = {
        unitid: unidade,
        fileurl: url,
        comment: comment ?? null,
      };

      // create submission via DesafiosUnidadesService
      const submission = await this.desafiosSvc.submit(challengeId, payload);

      return { url, submission };
    } catch (err) {
      this.logger.error(`uploadDesafio error req=${reqId}`, err as any);
      throw err;
    }
  }
}
