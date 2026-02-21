import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ClassesService } from './classes.service';

@Controller()
export class ClassesController {
  constructor(private service: ClassesService) {}

  // GET /classes/:id/requisitos?desbravadorId=1
  @Get('classes/:id/requisitos')
  async getRequisitos(@Param('id') id: string, @Query('desbravadorId') desbravadorId?: string) {
    const cid = Number(id);
    const did = desbravadorId ? Number(desbravadorId) : undefined;
    return this.service.getRequisitosByClass(cid, did);
  }

  // POST /requisitos/marca
  @Post('requisitos/marca')
  async marcar(@Body() body: { requisitoId: number; desbravadores: number[]; instrutorId?: number; data?: string; observacao?: string }) {
    return this.service.marcarRequisitos(body);
  }

  // POST /requisitos/desmarcar
  @Post('requisitos/desmarcar')
  async desmarcar(@Body() body: { requisitoId: number; desbravadores?: number[] }) {
    return this.service.desmarcarRequisitos(body);
  }

  // GET /classes
  @Get('classes')
  async list() {
    return this.service.listClasses();
  }
}
