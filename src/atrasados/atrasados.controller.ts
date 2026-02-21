import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AtrasadosService } from './atrasados.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('atrasados')
export class AtrasadosController {
  constructor(private atrasadosService: AtrasadosService) {}

  @Post('marcar')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async marcarAtrasado(
    @Body() body: { userId?: number; desbravadorId?: number; observacao?: string }
  ) {
    return this.atrasadosService.marcarAtrasado(body.userId, body.desbravadorId, body.observacao);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async removerAtrasado(@Param('id') id: string) {
    return this.atrasadosService.removerAtrasado(Number(id));
  }

  @Get('historico')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listarHistorico(
    @Query('data') data?: string,
    @Query('userId') userId?: string,
    @Query('desbravadorId') desbravadorId?: string
  ) {
    const filtro: any = {};

    if (data) {
      filtro.data = new Date(data);
    }

    if (userId) {
      filtro.userId = Number(userId);
    }

    if (desbravadorId) {
      filtro.desbravadorId = Number(desbravadorId);
    }

    return this.atrasadosService.listarAtrasados(filtro);
  }

  @Get('hoje')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listarAtrasadosHoje() {
    return this.atrasadosService.listarAtrasadosHoje();
  }

  @Get('usuarios')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listarUsuarios() {
    return this.atrasadosService.listarTodosUsuarios();
  }

  @Get('desbravadores')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listarDesbravadores() {
    return this.atrasadosService.listarTodosDesbravadores();
  }
}
