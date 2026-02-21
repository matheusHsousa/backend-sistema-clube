import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { DesbravadoresService } from './desbravadores.service';

@Controller('desbravadores')
export class DesbravadoresController {
  constructor(private service: DesbravadoresService) {}

  @Post()
  create(@Body() body: { name: string; birthDate?: string; unidade: string; classe: string }) {
    return this.service.create(body);
  }

  @Get()
  findAll(@Query() query: { unidade?: string; classe?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; birthDate?: string; unidade?: string; classe?: string }) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
