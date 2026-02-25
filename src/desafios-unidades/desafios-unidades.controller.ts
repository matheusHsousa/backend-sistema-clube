import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { DesafiosUnidadesService } from './desafios-unidades.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('desafios-unidades')
export class DesafiosUnidadesController {
  constructor(private service: DesafiosUnidadesService) {}

  @Get()
  async all() {
    return this.service.all();
  }

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Post(':challengeId/submit')
  @UseGuards(FirebaseAuthGuard)
  async submit(@Param('challengeId') challengeId: string, @Body() body: any, @Req() req: any) {
    // attach submitting user/unit when possible
    const user = req.user;
    const payload = {
      unitid: body.unitid ?? user?.unidade,
      fileurl: body.fileurl,
      comment: body.comment,
      submetidopor: user?.id,
    };
    return this.service.submit(challengeId, payload);
  }

  @Get('submissions/pending')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async pendingSubmissions() {
    const rows = await this.service.pendingSubmissions();
    // ensure the nested desafioUnidade is present and normalize field names if needed
    return rows.map((r: any) => ({
      id: r.id,
      desafiounidadeid: r.desafiounidadeid ?? r.desafioUnidadeId ?? r.desafiounidade_id,
      unitid: r.unitid,
      fileurl: r.fileurl,
      comment: r.comment,
      aprovado: r.aprovado,
      nota: r.nota ?? null,
      aprovadorid: r.aprovadorid ?? null,
      createdat: r.createdat || r.createdAt,
      dataaprovacao: r.dataaprovacao || r.dataAprovacao || null,
      desafioUnidade: r.desafioUnidade || r.desafiounidade || null,
    }));
  }

  @Get('submissions/mine')
  @UseGuards(FirebaseAuthGuard)
  async mySubmissions(@Req() req: any) {
    const user = req.user;
    const unit = user?.unidade ?? null;
    const uid = user?.id ?? null;
    const rows = await this.service.submissionsForUnit(unit, uid);
    return rows.map((r: any) => ({
      id: r.id,
      desafiounidadeid: r.desafiounidadeid ?? r.desafioUnidadeId ?? r.desafiounidade_id,
      unitid: r.unitid,
      fileurl: r.fileurl,
      comment: r.comment,
      aprovado: r.aprovado,
      nota: r.nota ?? null,
      aprovadorid: r.aprovadorid ?? null,
      createdat: r.createdat || r.createdAt,
      dataaprovacao: r.dataaprovacao || r.dataAprovacao || null,
      desafioUnidade: r.desafioUnidade || r.desafiounidade || null,
    }));
  }

  @Get('available')
  @UseGuards(FirebaseAuthGuard)
  async available(@Req() req: any) {
    const user = req.user;
    const unit = user?.unidade ?? null;
    const rows = await this.service.availableForUnit(unit);
    return rows;
  }

  @Post('submissions/:submissionId/approve')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveSubmission(@Param('submissionId') submissionId: string, @Body() body: { nota: number; aprovadorId?: string }, @Req() req: any) {
    const aprovadorId = body.aprovadorId || req.user?.id || null;
    return this.service.approveSubmission(submissionId, body.nota, aprovadorId);
  }
}
