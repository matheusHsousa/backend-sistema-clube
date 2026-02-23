import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type ClasseRankMap = Record<string, number>;

@Injectable()
export class MeritoService {
  constructor(private supabase: SupabaseService) {}

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
   */
  async ranking(weights: { class: number; unit?: number; points: number }, top?: number) {
    // Fetch desbravadores with their points
    const { data: desbravadores } = await this.supabase.client
      .from('desbravador')
      .select('*, points(*)');

    const rows = desbravadores || [];

    const maxPoints = rows.reduce((m: number, d: any) => Math.max(m, d.points?.[0]?.total ?? 0), 0) || 1;

    const classWeight = weights.class;
    const unitWeight = weights.unit ?? 0;
    const pointsWeight = weights.points;
    const classUnitWeight = classWeight + unitWeight;
    const weightSum = classUnitWeight + pointsWeight || 1;

    const normalizedClassUnitWeight = classUnitWeight / weightSum;
    const normalizedPointsWeight = pointsWeight / weightSum;

    const classes = Array.from(new Set(rows.map((d: any) => String(d.classe || 'AMIGO'))));
    const totalByClasse: Record<string, number> = {};

    await Promise.all(
      classes.map(async (c) => {
        const { data: classeEntity } = await this.supabase.client
          .from('classeEntity')
          .select('id')
          .eq('nome', c)
          .limit(1)
          .maybeSingle();
        if (!classeEntity) {
          totalByClasse[c] = 0;
          return;
        }
        const { count } = await this.supabase.client
          .from('classeRequisito')
          .select('id', { count: 'exact', head: false })
          .eq('classeId', classeEntity.id);
        totalByClasse[c] = typeof count === 'number' ? count : 0;
      }),
    );

    const completedCounts = await Promise.all(
      rows.map(async (d: any) => {
        const { count } = await this.supabase.client
          .from('desbravadorRequisito')
          .select('id', { count: 'exact', head: false })
          .eq('desbravadorId', d.id)
          .eq('concluido', true);
        return typeof count === 'number' ? count : 0;
      }),
    );

    const pointsByUnit: Record<string, { sum: number; count: number }> = {};
    rows.forEach((d: any) => {
      const unit = String(d.unidade || '');
      const pts = d.points?.[0]?.total ?? 0;
      pointsByUnit[unit] = pointsByUnit[unit] || { sum: 0, count: 0 };
      pointsByUnit[unit].sum += pts;
      pointsByUnit[unit].count += 1;
    });
    const avgPointsByUnit: Record<string, number> = {};
    Object.keys(pointsByUnit).forEach((u) => {
      const v = pointsByUnit[u];
      avgPointsByUnit[u] = v.count > 0 ? v.sum / v.count : 0;
    });

    const scored = rows.map((d: any, idx: number) => {
      const classe = String(d.classe || 'AMIGO');
      const totalReq = totalByClasse[classe] ?? 0;
      const completed = completedCounts[idx] ?? 0;

      const classCompletion = totalReq > 0 ? completed / totalReq : 1; // 0..1
      const pts = d.points?.[0]?.total ?? 0;
      const normPoints = maxPoints > 0 ? pts / maxPoints : 0;

      const unit = String(d.unidade || '');
      const avgPoints = avgPointsByUnit[unit] ?? normPoints;
      const unitScore = maxPoints > 0 ? avgPoints / maxPoints : 0; // 0..1

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
