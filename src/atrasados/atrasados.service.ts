import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AtrasadosService {
  constructor(private prisma: PrismaService) {}

  async marcarAtrasado(userId?: number, desbravadorId?: number, observacao?: string) {
    if (!userId && !desbravadorId) {
      throw new Error('É necessário fornecer userId ou desbravadorId');
    }

    const atrasado = await this.prisma.atrasado.create({
      data: {
        userId: userId || null,
        desbravadorId: desbravadorId || null,
        observacao,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
          },
        },
        desbravador: {
          select: {
            id: true,
            name: true,
            unidade: true,
            classe: true,
          },
        },
      },
    });

    // Se é desbravador, remover pontos do ranking
    if (desbravadorId) {
      await this.removerPontosAtrasado(desbravadorId);
    }

    return atrasado;
  }

  async removerPontosAtrasado(desbravadorId: number) {
    // Remover 1 ponto por atrasado
    const points = await this.prisma.points.findUnique({
      where: { desbravadorId },
    });

    if (points) {
      await this.prisma.pointsTransaction.create({
        data: {
          pointsId: points.id,
          amount: -1,
          type: 'ADJUST',
          reason: 'Atrasado',
        },
      });

      await this.prisma.points.update({
        where: { desbravadorId },
        data: { total: Math.max(0, points.total - 1) },
      });
    } else {
      // Se não tem pontos ainda, criar com valor 0
      await this.prisma.points.create({
        data: {
          desbravadorId,
          total: 0,
          transactions: {
            create: {
              amount: -1,
              type: 'ADJUST',
              reason: 'Atrasado',
            },
          },
        },
      });
    }
  }

  async removerAtrasado(atrasadoId: number) {
    const atrasado = await this.prisma.atrasado.delete({
      where: { id: atrasadoId },
      include: { desbravador: true },
    });

    // Devolver ponto se era desbravador
    if (atrasado.desbravadorId) {
      const points = await this.prisma.points.findUnique({
        where: { desbravadorId: atrasado.desbravadorId },
      });

      if (points) {
        await this.prisma.pointsTransaction.create({
          data: {
            pointsId: points.id,
            amount: 1,
            type: 'ADJUST',
            reason: 'Atrasado removido',
          },
        });

        await this.prisma.points.update({
          where: { desbravadorId: atrasado.desbravadorId },
          data: { total: points.total + 1 },
        });
      }
    }

    return atrasado;
  }

  async listarAtrasados(filtro?: { data?: Date; userId?: number; desbravadorId?: number }) {
    const where: any = {};

    if (filtro?.data) {
      const data = new Date(filtro.data);
      const ehDataValida = !Number.isNaN(data.getTime());

      if (ehDataValida) {
        const inicio = new Date(Date.UTC(
          data.getUTCFullYear(),
          data.getUTCMonth(),
          data.getUTCDate(),
          0,
          0,
          0,
          0,
        ));
        const fimExclusivo = new Date(Date.UTC(
          data.getUTCFullYear(),
          data.getUTCMonth(),
          data.getUTCDate() + 1,
          0,
          0,
          0,
          0,
        ));

        where.data = {
          gte: inicio,
          lt: fimExclusivo,
        };
      }
    }

    if (filtro?.userId) {
      where.userId = filtro.userId;
    }

    if (filtro?.desbravadorId) {
      where.desbravadorId = filtro.desbravadorId;
    }

    return this.prisma.atrasado.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
          },
        },
        desbravador: {
          select: {
            id: true,
            name: true,
            unidade: true,
            classe: true,
          },
        },
      },
      orderBy: { data: 'desc' },
    });
  }

  async listarAtrasadosHoje() {
    const hoje = new Date();

    return this.listarAtrasados({ data: hoje });
  }

  async listarTodosUsuarios() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async listarTodosDesbravadores() {
    return this.prisma.desbravador.findMany({
      select: {
        id: true,
        name: true,
        unidade: true,
        classe: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
