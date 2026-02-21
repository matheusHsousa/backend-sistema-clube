import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ClasseRankMap = Record<string, number>;

@Injectable()
export class MeritoService {
  constructor(private prisma: PrismaService) {}

  // classeRank: AMIGO=1 .. GUIA=6
  private classeRank: ClasseRankMap = {
    AMIGO: 1,
    COMPANHEIRO: 2,
    PESQUISADOR: 3,
    PIONEIRO: 4,
    EXCURSIONISTA: 5,
    GUIA: 6,
  };

  /**
   * Calcula ranking de mérito.
   * weights: { class: number, points: number } — valores relativos (por exemplo class 30, points 60)
   */
  async ranking(weights: { class: number; unit?: number; points: number }, top?: number) {
    const desbravadores = await this.prisma.desbravador.findMany({ include: { points: true } });

    const maxPoints = desbravadores.reduce((m, d) => Math.max(m, d.points?.total ?? 0), 0) || 1;

    const classWeight = weights.class;
    const unitWeight = weights.unit ?? 0;
    const pointsWeight = weights.points;
    const classUnitWeight = classWeight + unitWeight;
    const weightSum = classUnitWeight + pointsWeight || 1;

    const normalizedClassUnitWeight = classUnitWeight / weightSum;
    const normalizedPointsWeight = pointsWeight / weightSum;

    // Precompute total requisitos per classe (using ClasseEntity.nome === enum string)
    const classes = Array.from(new Set(desbravadores.map((d) => String(d.classe || 'AMIGO'))));
    const totalByClasse: Record<string, number> = {};

    await Promise.all(
      classes.map(async (c) => {
        const classeEntity = await this.prisma.classeEntity.findFirst({ where: { nome: c } });
        if (!classeEntity) {
          totalByClasse[c] = 0;
          return;
        }
        const cnt = await this.prisma.classeRequisito.count({ where: { classeId: classeEntity.id } });
        totalByClasse[c] = cnt;
      }),
    );

    // For each desbravador, get completed requisitos count
    const completedCounts = await Promise.all(
      desbravadores.map((d) =>
        this.prisma.desbravadorRequisito.count({ where: { desbravadorId: d.id, concluido: true } }),
      ),
    );

    // Compute average points per unit
    const pointsByUnit: Record<string, { sum: number; count: number }> = {};
    desbravadores.forEach((d) => {
      const unit = String(d.unidade || '');
      const pts = d.points?.total ?? 0;
      pointsByUnit[unit] = pointsByUnit[unit] || { sum: 0, count: 0 };
      pointsByUnit[unit].sum += pts;
      pointsByUnit[unit].count += 1;
    });
    const avgPointsByUnit: Record<string, number> = {};
    Object.keys(pointsByUnit).forEach((u) => {
      const v = pointsByUnit[u];
      avgPointsByUnit[u] = v.count > 0 ? v.sum / v.count : 0;
    });

    const scored = desbravadores.map((d, idx) => {
      const classe = String(d.classe || 'AMIGO');
      const totalReq = totalByClasse[classe] ?? 0;
      const completed = completedCounts[idx] ?? 0;

      const classCompletion = totalReq > 0 ? completed / totalReq : 1; // 0..1
      const pts = d.points?.total ?? 0;
      const normPoints = maxPoints > 0 ? pts / maxPoints : 0;

      // unit score: average points of the unit normalized by maxPoints
      const unit = String(d.unidade || '');
      const avgPoints = avgPointsByUnit[unit] ?? normPoints;
      const unitScore = maxPoints > 0 ? avgPoints / maxPoints : 0; // 0..1

      // combine class and unit by their relative weights
      const classUnitComposite = classUnitWeight > 0
        ? (classCompletion * classWeight + unitScore * unitWeight) / classUnitWeight
        : classCompletion;

      const score = classUnitComposite * normalizedClassUnitWeight + normPoints * normalizedPointsWeight;

      return {
        id: d.id,
        name: d.name,
        unidade: d.unidade,
        classe: d.classe,
        points: pts,
        classCompletion: totalReq > 0 ? (classCompletion * 100) : 100,
        unitScore: unitScore * 100,
        classUnitAvg: classUnitComposite * 100,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return typeof top === 'number' ? scored.slice(0, top) : scored;
  }
}
