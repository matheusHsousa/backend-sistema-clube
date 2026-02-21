import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TextosBiblicosService } from './textos-biblicos.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('textos-biblicos')
export class TextosBiblicosController {
  constructor(private textosBiblicosService: TextosBiblicosService) {}

  @Get('devedores')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONSELHEIRO', 'INSTRUTOR')
  async listarDevedores() {
    return this.textosBiblicosService.listarDevedores();
  }

  @Get('pendentes')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listarTextosPendentes() {
    return this.textosBiblicosService.listarTextosPendentes();
  }

  @Get('meus-atrasados')
  @UseGuards(FirebaseAuthGuard)
  async buscarMeusAtrasados(
    @Query('userId') userId?: string,
    @Query('desbravadorId') desbravadorId?: string,
    @Req() request?: any
  ) {
    // If requester is ADMIN, always return full devedores list (ignore query params)
    const roles: string[] = request?.user?.roles ?? [];
    if (roles.includes('ADMIN')) {
      return this.textosBiblicosService.listarDevedores();
    }

    // For non-admins, delegate to buscarAtrasadosPessoa; pass numbers only if present
    return this.textosBiblicosService.buscarAtrasadosPessoa(
      userId ? Number(userId) : undefined,
      desbravadorId ? Number(desbravadorId) : undefined
    );
  }

  @Post('enviar')
  @UseGuards(FirebaseAuthGuard)
  async enviarTexto(
    @Body() body: { atrasadoId: number; imagemUrl: string }
  ) {
    return this.textosBiblicosService.enviarTexto(
      body.atrasadoId,
      body.imagemUrl
    );
  }

  @Post('aprovar/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async aprovarTexto(@Param('id') id: string, @Req() request: any) {
    const aprovadorId = request.user?.id;
    return this.textosBiblicosService.aprovarTexto(Number(id), aprovadorId);
  }

  @Delete('rejeitar/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejeitarTexto(@Param('id') id: string) {
    return this.textosBiblicosService.rejeitarTexto(Number(id));
  }
}
