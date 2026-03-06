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
    // Validate that at least one filter is provided
    if (!data && !userId && !desbravadorId) {
      throw new (require('@nestjs/common').BadRequestException)('At least one filter is required');
    }

    const filtro: any = {};

    if (data) {
      const d = new Date(data);
      if (Number.isNaN(d.getTime())) {
        throw new (require('@nestjs/common').BadRequestException)('Invalid date');
      }
      filtro.data = d;
    }

    if (userId) {
      const n = Number(userId);
      if (!Number.isFinite(n)) throw new (require('@nestjs/common').BadRequestException)('userId must be a number');
      filtro.userId = n;
    }

    if (desbravadorId) {
      const n = Number(desbravadorId);
      if (!Number.isFinite(n)) throw new (require('@nestjs/common').BadRequestException)('desbravadorId must be a number');
      filtro.desbravadorId = n;
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
