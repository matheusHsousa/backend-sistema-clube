import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async getRequisitosByClass(classeId: number, desbravadorId?: number) {
    // incluir progresso com dados do desbravador e do instrutor
    const progressoInclude: any = { include: { desbravador: true, instrutor: true } };
    if (desbravadorId) {
      progressoInclude.where = { desbravadorId };
    }

    return (this.prisma as any).classeRequisito.findMany({
      where: { classeId },
      orderBy: { ordem: 'asc' },
      include: { progresso: progressoInclude },
    });
  }

  async listClasses() {
    return (this.prisma as any).classeEntity.findMany({ orderBy: { ordem: 'asc' } });
  }

  async marcarRequisitos(payload: {
    requisitoId: number;
    desbravadores: number[];
    instrutorId?: number;
    data?: string;
    observacao?: string;
  }) {
    const created: any[] = [];
    const when = payload.data ? new Date(payload.data) : new Date();
    for (const dId of payload.desbravadores) {
      // evita duplicatas: checa se já existe
      const exists = await (this.prisma as any).desbravadorRequisito.findFirst({
        where: { desbravadorId: dId, requisitoId: payload.requisitoId },
      });
      if (exists) {
        created.push(exists);
        continue;
      }

      const item = await (this.prisma as any).desbravadorRequisito.create({
        data: {
          desbravadorId: dId,
          requisitoId: payload.requisitoId,
          instrutorId: payload.instrutorId || undefined,
          data: when,
          observacao: payload.observacao,
          concluido: true,
        },
      });
      created.push(item);
    }

    return created;
  }

  async desmarcarRequisitos(payload: { requisitoId: number; desbravadores?: number[] }) {
    const where: any = { requisitoId: payload.requisitoId };
    if (payload.desbravadores && payload.desbravadores.length) {
      where.desbravadorId = { in: payload.desbravadores };
    }

    const res = await (this.prisma as any).desbravadorRequisito.deleteMany({ where });
    return { deleted: res.count };
  }
}
