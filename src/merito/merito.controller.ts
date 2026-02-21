import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MeritoService } from './merito.service';

@Controller('merito')
export class MeritoController {
  constructor(private svc: MeritoService) {}

  // GET /merito/top/:n
  @Get('top/:n')
  async top(@Param('n', ParseIntPipe) n: number) {
    // Preset: class 9, unit 1, points 60 (class has weight 9, unit 1)
    return this.svc.ranking({ class: 9, unit: 1, points: 60 }, n);
  }

  // GET /merito — retorna todos com preset
  @Get()
  async all() {
    return this.svc.ranking({ class: 9, unit: 1, points: 60 });
  }
}
