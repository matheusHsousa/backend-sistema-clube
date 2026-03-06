import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Patch, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth/firebase-auth.guard';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('transactions')
  @UseGuards(FirebaseAuthGuard)
  async listTransactions(
    @Query() query: { desbravadorId?: string; sundayDate?: string; unidade?: string },
    @Req() req: any,
  ) {
    // require sundayDate to avoid broad queries
    if (!query.sundayDate) {
      throw new BadRequestException('Informe o parâmetro sundayDate (obrigatório)');
    }

    const desbravadorId = query.desbravadorId ? Number(query.desbravadorId) : undefined;
    // prefer explicit unidade query param, otherwise use authenticated user's unidade
    const unidade = query.unidade ? Number(query.unidade) : (req.user?.unidade ? Number(req.user.unidade) : undefined);

    return this.pointsService.listTransactions({ desbravadorId, sundayDate: query.sundayDate, unidade });
  }
  @Get('batch')
  async getBatch(@Query('ids') ids?: string) {
    if (!ids) return {};
    const arr = String(ids).split(',').map(s => Number(s)).filter(n => Number.isFinite(n));
    if (!arr.length) return {};
    return this.pointsService.getByDesbravadorBatch(arr);
  }

  @Get(':desbravadorId')
  async getPoints(@Param('desbravadorId', ParseIntPipe) desbravadorId: number) {
    const result = await this.pointsService.getByDesbravador(desbravadorId);
    if (!result) return [];
    return result;
  }

  @Post('adjust')
  adjust(@Body() body: {
    desbravadorId: number;
    amount?: number;
    presence?: number;
    pontualidade?: number;
    uniforme?: number;
    material?: number;
    classe?: number;
    espEquipe?: number;
    disciplina?: number;
    textoBiblico?: number;
    reason?: string;
    authorId?: number;
    sundayDate?: string;
  }) {
    return this.pointsService.adjust(body);
  }

  @Post('adjust/batch')
  adjustBatch(@Body() body: Array<any>) {
    return this.pointsService.adjustBatch(body || []);
  }

  @Patch('transaction/:id')
  editTransaction(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    // require sundayDate in payload to avoid creating transactions without a valid sunday
    if (!body || !body.sundayDate) {
      throw new BadRequestException('sundayDate é obrigatório ao editar transação');
    }
    // validate date parse
    const d = new Date(body.sundayDate);
    if (isNaN(d.getTime())) {
      throw new BadRequestException('sundayDate inválido');
    }
    return this.pointsService.editTransaction(id, body);
  }
}
