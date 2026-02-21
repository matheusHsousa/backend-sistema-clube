import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async getByDesbravador(desbravadorId: number) {
    const points = await this.prisma.points.findUnique({
      where: { desbravadorId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
    return points;
  }

  async adjust(payload: { desbravadorId: number; amount: number; reason?: string; authorId?: number }) {
    // perform both actions in a transaction so they stay consistent
    const result = await this.prisma.$transaction(async (tx) => {
      // validate desbravador exists
      const des = await tx.desbravador.findUnique({ where: { id: payload.desbravadorId } });
      if (!des) throw new NotFoundException('Desbravador not found');

      // if authorId provided, validate user exists
      if (payload.authorId) {
        const author = await tx.user.findUnique({ where: { id: payload.authorId } });
        if (!author) throw new NotFoundException('Author user not found');
      }

      const p = await tx.points.upsert({
        where: { desbravadorId: payload.desbravadorId },
        create: { desbravadorId: payload.desbravadorId, total: payload.amount },
        update: { total: { increment: payload.amount } },
      });

      const tr = await tx.pointsTransaction.create({
        data: {
          pointsId: p.id,
          amount: payload.amount,
          reason: payload.reason,
          authorId: payload.authorId || null,
        },
      });

      return { points: p, transaction: tr };
    });

    return result;
  }
}
