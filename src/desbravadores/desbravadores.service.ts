import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DesbravadoresService {
  constructor(private prisma: PrismaService) {}

  create(data: { name: string; birthDate?: string; unidade: string; classe: string }) {
  return (this.prisma as any).desbravador.create({
      data: {
        name: data.name,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        unidade: data.unidade as any,
        classe: data.classe as any,
      },
    });
  }

  findAll(filter?: { unidade?: string; classe?: string }) {
    const where: any = {};
    if (filter?.unidade) where.unidade = filter.unidade;
    if (filter?.classe) where.classe = filter.classe;

    return (this.prisma as any).desbravador.findMany({ where, orderBy: { name: 'asc' } });
  }

  findOne(id: number) {
  return (this.prisma as any).desbravador.findUnique({ where: { id } });
  }

  update(id: number, data: { name?: string; birthDate?: string; unidade?: string; classe?: string }) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.birthDate !== undefined) payload.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (data.unidade !== undefined) payload.unidade = data.unidade;
    if (data.classe !== undefined) payload.classe = data.classe;

  return (this.prisma as any).desbravador.update({ where: { id }, data: payload });
  }

  remove(id: number) {
  return (this.prisma as any).desbravador.delete({ where: { id } });
  }
}
