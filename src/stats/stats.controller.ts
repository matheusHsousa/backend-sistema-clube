import { Controller, Get, Query, Param } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private service: StatsService) {}

  @Get('instrutor/requisitos')
  async requisitosByInstrutor(@Query('instrutorId') instrutorId: string, @Query('start') start?: string, @Query('end') end?: string) {
    return this.service.requisitosPassedByInstrutor(Number(instrutorId), start, end);
  }

  @Get('instrutor/classe-resumo')
  async instrutorClasseResumo(@Query('instrutorId') instrutorId: string) {
    return this.service.instrutorClasseResumo(Number(instrutorId));
  }

  @Get('conselheiro/points')
  async pointsForConselheiro(@Query('unidade') unidade: string, @Query('start') start?: string, @Query('end') end?: string) {
    return this.service.pointsSummaryForConselheiro(unidade, start, end);
  }

  @Get('admin/overview')
  async adminOverview(@Query('start') start?: string, @Query('end') end?: string) {
    return this.service.adminOverview(start, end);
  }

  @Get('admin/units-points')
  async adminUnitsPoints(@Query('start') start?: string, @Query('end') end?: string) {
    return this.service.adminPointsByUnit(start, end);
  }

  @Get('admin/desbravadores-unidade-semanal')
  async adminDesbravadoresUnidadeSemanal(@Query('weeks') weeks?: string) {
    return this.service.adminDesbravadoresUnidadeSemanal(Number(weeks) || 12);
  }

  @Get('admin/requisitos-por-classe')
  async adminRequisitosPorClasse() {
    return this.service.adminRequisitosPorClasse();
  }

  @Get('admin/progresso-classes')
  async adminProgressoClasses() {
    return this.service.adminProgressoClasses();
  }

  @Get('conselheiro/pontuacao-semanal')
  async conselheiropontuacaoSemanal(@Query('unidade') unidade: string, @Query('weeks') weeks?: string) {
    return this.service.conselheiropontuacaoSemanal(unidade, Number(weeks) || 12);
  }

  @Get('conselheiro/best-worst')
  async conselheiroBestWorst(@Query('unidade') unidade: string, @Query('weeks') weeks?: string) {
    return this.service.conselheiroBestWorstDesbravador(unidade, Number(weeks) || 12);
  }

  @Get('conselheiro/ausencias')
  async conselheiroAusencias(@Query('unidade') unidade: string, @Query('startDate') startDate?: string) {
    return this.service.conselheiroAusencias(unidade, startDate);
  }
}
