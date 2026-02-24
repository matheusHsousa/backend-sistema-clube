import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get(':desbravadorId')
  async getPoints(@Param('desbravadorId', ParseIntPipe) desbravadorId: number) {
    const result = await this.pointsService.getByDesbravador(desbravadorId);
    if (!result) return [];
    return result;
  }

  @Post('adjust')
  adjust(@Body() body: { desbravadorId: number; amount: number; reason?: string; authorId?: number }) {
    return this.pointsService.adjust(body);
  }
}
