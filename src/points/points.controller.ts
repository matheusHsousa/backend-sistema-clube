import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get(':desbravadorId')
  getPoints(@Param('desbravadorId', ParseIntPipe) desbravadorId: number) {
    return this.pointsService.getByDesbravador(desbravadorId);
  }

  @Post('adjust')
  adjust(@Body() body: { desbravadorId: number; amount: number; reason?: string; authorId?: number }) {
    return this.pointsService.adjust(body);
  }
}
