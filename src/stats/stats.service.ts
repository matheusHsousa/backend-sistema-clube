import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
// Prisma removed — Unidade previously came from Prisma client. Use string alias.
type Unidade = string;

@Injectable()
export class StatsService {
  constructor(private supabase: SupabaseService) {}

  private getSundayEnd(date: Date) {
    const sunday = new Date(date);
    const day = sunday.getDay();
    const diff = (7 - day) % 7;
    sunday.setDate(sunday.getDate() + diff);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private extractDateFromReason(reason: string): Date | null {
    try {
      const dateMatch = reason.match(/\w+\s+(\w+)\s+(\d+)\s+(\d{4})\s+([\d:]+)/);
      if (!dateMatch) return null;
      return new Date(dateMatch[0]);
    } catch (e) {
      return null;
    }
  }

  private formatDateBR(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Instrutor: quantos requisitos foram passados por requisito e lista de desbravadores
  async requisitosPassedByInstrutor(instrutorId: number, start?: string, end?: string) {
    let q = this.supabase.client
      .from('desbravadorRequisito')
      .select('*, desbravador(*), requisito(*)')
      .eq('instrutorId', instrutorId);

    if (start) q = q.gte('data', new Date(start).toISOString());
    if (end) q = q.lte('data', new Date(end).toISOString());

    const { data: registros } = await q;

    const map = new Map();
    for (const r of registros || []) {
      const key = r.requisitoId;
      if (!map.has(key)) map.set(key, { requisito: r.requisito, count: 0, desbravadores: [] });
      const entry = map.get(key);
      entry.count += 1;
      entry.desbravadores.push(r.desbravador);
    }

    return Array.from(map.values());
  }

  async instrutorClasseResumo(instrutorId: number) {
    const { data: instrutor } = await this.supabase.client.from('User').select('classe').eq('id', instrutorId).limit(1).maybeSingle();
    const classe = instrutor?.classe;
    if (!classe) {
      return {
        classe: null,
        progressoClasse: 0,
        itensConcluidos: 0,
        itensTotal: 0,
        desbravadores: [],
        desbravadoresPercent: []
      };
    }
    const { data: classeEntity } = await this.supabase.client.from('classeEntity').select('*, requisitos(*)').eq('nome', classe).limit(1).maybeSingle();

    const { data: desbravadores } = await this.supabase.client.from('desbravador').select('id, name').eq('classe', classe).order('name', { ascending: true });

    const { data: requisitosConcluidos } = await this.supabase.client.from('desbravadorRequisito').select('desbravadorId').in('desbravadorId', (desbravadores || []).map((d: any) => d.id));

    const requisitosPorDesbravador = new Map<number, number>();
    for (const req of requisitosConcluidos || []) {
      requisitosPorDesbravador.set(req.desbravadorId, (requisitosPorDesbravador.get(req.desbravadorId) ?? 0) + 1);
    }

    const totalRequisitos = (classeEntity?.requisitos || []).length ?? 0;
    const totalDesbravadores = (desbravadores || []).length;
    const itensTotal = totalRequisitos * totalDesbravadores;
    const itensConcluidos = (requisitosConcluidos || []).length;
    const progressoClasse = itensTotal > 0 ? (itensConcluidos / itensTotal) * 100 : 0;
    const progressoClasseRounded = Math.round(progressoClasse * 100) / 100;

    const desbravadoresData = (desbravadores || []).map((d: any) => ({ name: d.name, concluidos: requisitosPorDesbravador.get(d.id) ?? 0 }));

    const desbravadoresPercent = (desbravadores || []).map((d: any) => {
      const concluidos = requisitosPorDesbravador.get(d.id) ?? 0;
      const percentual = totalRequisitos > 0 ? (concluidos / totalRequisitos) * 100 : 0;
      return { name: d.name, percentual: Math.round(percentual * 100) / 100 };
    });

    return { classe, progressoClasse: progressoClasseRounded, itensConcluidos, itensTotal, desbravadores: desbravadoresData, desbravadoresPercent };
  }

  // Conselheiro: pontuação por desbravador em unidade, média por unidade e melhor/pior
  async pointsSummaryForConselheiro(unidade: Unidade | string, start?: string, end?: string) {
    const unitVal = unidade as Unidade;
    const { data: des } = await this.supabase.client.from('desbravador').select('id').eq('unidade', unitVal);
    const ids = (des || []).map((d: any) => d.id);

    const { data: points } = await this.supabase.client.from('points').select('*, desbravador(*)').in('desbravadorId', ids);

    const sorted = (points || []).slice().sort((a: any, b: any) => (b.total ?? 0) - (a.total ?? 0));
    const best = sorted[0] ?? null;
    const worst = sorted[sorted.length - 1] ?? null;

    // unitsAvg approximation: average points per unit
    const { data: allDes } = await this.supabase.client.from('desbravador').select('id, unidade');
    const unitsMap: Record<string, { sum: number; count: number }> = {};
    const { data: allPoints } = await this.supabase.client.from('points').select('desbravadorId, total');
    const pointsByDes = new Map((allPoints || []).map((p: any) => [p.desbravadorId, p.total]));
    for (const drow of allDes || []) {
      const unit = drow.unidade || '';
      unitsMap[unit] = unitsMap[unit] || { sum: 0, count: 0 };
      const pid = drow.id;
      const pts = pointsByDes.get(pid) ?? 0;
      unitsMap[unit].sum += pts;
      unitsMap[unit].count += 1;
    }

    const unitsAvg = Object.keys(unitsMap).map((u) => ({ unidade: u, avg: unitsMap[u].count ? unitsMap[u].sum / unitsMap[u].count : 0 }));

    return { points: points || [], best, worst, unitsAvg };
  }

  // Admin: stats por unidade e classe
  async adminOverview(start?: string, end?: string) {
    const { data: aprovados } = await this.supabase.client.from('desbravadorRequisito').select('desbravadorId, id');
    const aprovadosCount = (aprovados || []).reduce((acc: Record<number, number>, row: any) => { acc[row.desbravadorId] = (acc[row.desbravadorId] || 0) + 1; return acc; }, {});

    const { data: pts } = await this.supabase.client.from('points').select('*, desbravador(*)');
    return { aprovados: aprovadosCount, pts: pts || [] };
  }

  async adminDesbravadoresUnidadeSemanal(weeks = 12) {
    const { data: desbravadores } = await this.supabase.client.from('desbravador').select('unidade, createdAt').order('createdAt', { ascending: true });

    // Derive units from desbravadores data (Prisma enum removed)
    const unidades: string[] = Array.from(new Set((desbravadores || []).map((d: any) => String(d.unidade || ''))));
    const totals = unidades.reduce((acc: Record<string, number>, unidade: string) => {
      acc[unidade] = 0;
      return acc;
    }, {} as Record<string, number>);

    const now = new Date();
    const lastSunday = this.getSundayEnd(now);
    const sundayPoints: Date[] = [];

    const safeWeeks = Number.isFinite(weeks) && weeks > 0 ? Math.min(weeks, 104) : 12;
    for (let i = safeWeeks - 1; i >= 0; i--) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() - i * 7);
      sundayPoints.push(d);
    }

    // build cumulative counts per sunday
    const rows = sundayPoints.map((sunday) => {
      const values = unidades.reduce((acc: Record<string, number>, unidade: string) => ({ ...acc, [unidade]: 0 }), {} as Record<string, number>);
      for (const d of desbravadores || []) {
        if (new Date(d.createdAt) <= sunday) {
          values[d.unidade] = (values[d.unidade] || 0) + 1;
        }
      }
      return { date: this.formatDateKey(sunday), values };
    });

    return {
      unidades,
      rows
    };
  }

  async adminRequisitosPorClasse() {
    const { data: requisitos } = await this.supabase.client.from('desbravadorRequisito').select('desbravadorId, desbravador(*)');
    const classeMap = new Map<string, Set<number>>();
    for (const req of requisitos || []) {
      const des: any = req?.desbravador;
      const classe = Array.isArray(des) ? des[0]?.classe : des?.classe;
      if (!classe) continue;
      if (!classeMap.has(classe)) classeMap.set(classe, new Set());
      classeMap.get(classe)!.add(req.desbravadorId);
    }

    const data = Array.from(classeMap.entries()).map(([classe, desbravadores]) => [classe, desbravadores.size]).sort((a, b) => (b[1] as number) - (a[1] as number));
    return { data };
  }

  async adminProgressoClasses() {
    const { data: classeEntities } = await this.supabase.client.from('classeEntity').select('*, requisitos(*)');
    const { data: desbravadores } = await this.supabase.client.from('desbravador').select('id, classe');
    const { data: requisitosCompletos } = await this.supabase.client.from('desbravadorRequisito').select('desbravadorId');

    const requisitosPorDesbravador = new Map<number, number>();
    for (const req of requisitosCompletos || []) {
      requisitosPorDesbravador.set(req.desbravadorId, (requisitosPorDesbravador.get(req.desbravadorId) ?? 0) + 1);
    }

    const data: Array<{ classe: string; progresso: number; itemsFeitos: number; itemsTotal: number; legenda: string }> = [];

    for (const classeEntity of (classeEntities || [])) {
      const nomeSqlite = classeEntity.nome;
      const desbravadoresDaClasse = (desbravadores || []).filter((d: any) => d.classe === nomeSqlite);
      const totalRequisitos = (classeEntity.requisitos || []).length || 1;
      let totalItemsFeitos = 0;
      let desbravadoresComItens = 0;

      for (const desbrav of desbravadoresDaClasse) {
        const completos = requisitosPorDesbravador.get(desbrav.id) ?? 0;
        totalItemsFeitos += completos;
        if (completos > 0) desbravadoresComItens += 1;
      }

      const totalDesbravadores = desbravadoresDaClasse.length || 1;
      const itemsTotal = totalDesbravadores * totalRequisitos;
      const percentualCompletos = totalDesbravadores > 0 ? (desbravadoresComItens / totalDesbravadores) * 100 : 0;
      const percentualItens = itemsTotal > 0 ? (totalItemsFeitos / itemsTotal) * 100 : 0;

      const percentualRounded = Math.round(percentualCompletos * 100) / 100;
      const percentualItensRounded = Math.round(percentualItens * 100) / 100;

      data.push({ classe: nomeSqlite, progresso: percentualRounded, itemsFeitos: totalItemsFeitos, itemsTotal: itemsTotal, legenda: `${totalItemsFeitos}/${itemsTotal} - ${percentualItensRounded}%` });
    }

    return { data: data.sort((a, b) => b.progresso - a.progresso) };
  }

  async conselheiropontuacaoSemanal(unidade: string, weeks = 12) {
    const { data: desbravadores } = await this.supabase.client.from('desbravador').select('id, name').eq('unidade', unidade).order('name', { ascending: true });
    const desIds = (desbravadores || []).map((d: any) => d.id);
    const { data: transacoes } = await this.supabase.client.from('pointsTransaction').select('*, points(desbravadorId)').in('points.desbravadorId', desIds).order('reason', { ascending: true });

    const acumuladoPorDesbravador = new Map<number, number>();
    const transacoesPorDesbravador = new Map<number, Array<{ data: Date; amount: number }>>();

    for (const transacao of transacoes || []) {
      const desbravaId = transacao.points?.desbravadorId;
      const amount = transacao.amount;
      const dataExtraida = (transacao.reason ? this.extractDateFromReason(transacao.reason) : null) || new Date(transacao.createdAt);
      acumuladoPorDesbravador.set(desbravaId, (acumuladoPorDesbravador.get(desbravaId) ?? 0) + amount);
      if (!transacoesPorDesbravador.has(desbravaId)) transacoesPorDesbravador.set(desbravaId, []);
      transacoesPorDesbravador.get(desbravaId)!.push({ data: dataExtraida, amount });
    }

    const now = new Date();
    const lastSunday = this.getSundayEnd(now);
    const sundayPoints: Date[] = [];
    const safeWeeks = Number.isFinite(weeks) && weeks > 0 ? Math.min(weeks, 104) : 12;
    for (let i = safeWeeks - 1; i >= 0; i--) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() - i * 7);
      sundayPoints.push(d);
    }

    const rows = sundayPoints.map((sunday) => {
      const row: any = { date: this.formatDateBR(sunday) };
      for (const desbrav of desbravadores || []) {
        const transacoesDesbrav = transacoesPorDesbravador.get(desbrav.id) ?? [];
        let acumulado = 0;
        for (const trans of transacoesDesbrav) {
          if (trans.data <= sunday) acumulado += trans.amount;
        }
        row[desbrav.name] = acumulado;
      }
      return row;
    });

    return { desbravadores: (desbravadores || []).map((d: any) => d.name), rows };
  }

  async conselheiroBestWorstDesbravador(unidade: string, weeks = 12) {
    const { data: desbravadores } = await this.supabase.client.from('desbravador').select('id, name').eq('unidade', unidade).order('name', { ascending: true });
    const desIds = (desbravadores || []).map((d: any) => d.id);
    const { data: transacoes } = await this.supabase.client.from('pointsTransaction').select('*, points(desbravadorId)').in('points.desbravadorId', desIds).order('reason', { ascending: true });

    const acumuladoPorDesbravador = new Map<number, number>();
    const transacoesPorDesbravador = new Map<number, Array<{ data: Date; amount: number }>>();

    for (const transacao of transacoes || []) {
      const desbravaId = transacao.points?.desbravadorId;
      const amount = transacao.amount;
      const dataExtraida = (transacao.reason ? this.extractDateFromReason(transacao.reason) : null) || new Date(transacao.createdAt);
      acumuladoPorDesbravador.set(desbravaId, (acumuladoPorDesbravador.get(desbravaId) ?? 0) + amount);
      if (!transacoesPorDesbravador.has(desbravaId)) transacoesPorDesbravador.set(desbravaId, []);
      transacoesPorDesbravador.get(desbravaId)!.push({ data: dataExtraida, amount });
    }

    let bestDesbravador: string | null = null;
    let worstDesbravador: string | null = null;
    let maxPontos = -Infinity;
    let minPontos = Infinity;

    for (const desbrav of desbravadores || []) {
      const total = acumuladoPorDesbravador.get(desbrav.id) ?? 0;
      if (total > maxPontos) {
        maxPontos = total;
        bestDesbravador = desbrav.name;
      }
      if (total < minPontos) {
        minPontos = total;
        worstDesbravador = desbrav.name;
      }
    }

    const now = new Date();
    const lastSunday = this.getSundayEnd(now);
    const sundayPoints: Date[] = [];

    const safeWeeks = Number.isFinite(weeks) && weeks > 0 ? Math.min(weeks, 104) : 12;
    for (let i = safeWeeks - 1; i >= 0; i--) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() - i * 7);
      sundayPoints.push(d);
    }

    const rows = sundayPoints.map((sunday) => {
      const row: any = { date: this.formatDateBR(sunday) };

      if (bestDesbravador) {
          const desbravBest = (desbravadores || []).find((d) => d.name === bestDesbravador);
        if (desbravBest) {
          const transacoesDesbrav = transacoesPorDesbravador.get(desbravBest.id) ?? [];
          let acumulado = 0;
          for (const trans of transacoesDesbrav) {
            if (trans.data <= sunday) {
              acumulado += trans.amount;
            }
          }
          row['Melhor'] = acumulado;
        }
      }

      if (worstDesbravador) {
        const desbravWorst = (desbravadores || []).find((d) => d.name === worstDesbravador);
        if (desbravWorst) {
          const transacoesDesbrav = transacoesPorDesbravador.get(desbravWorst.id) ?? [];
          let acumulado = 0;
          for (const trans of transacoesDesbrav) {
            if (trans.data <= sunday) {
              acumulado += trans.amount;
            }
          }
          row['Pior'] = acumulado;
        }
      }

      return row;
    });

    return {
      best: { name: bestDesbravador, points: maxPontos },
      worst: { name: worstDesbravador, points: minPontos },
      rows
    };
  }

  async conselheiroAusencias(unidade: string, startDate?: string) {
    const { data: desbravadores } = await this.supabase.client.from('desbravador').select('id, name').eq('unidade', unidade).order('name', { ascending: true });
    const desIds = (desbravadores || []).map((d: any) => d.id);
    const { data: transacoes } = await this.supabase.client.from('pointsTransaction').select('*, points(desbravadorId)').in('points.desbravadorId', desIds).order('reason', { ascending: true });

    const transacoesPorDesbravadorPorData = new Map<number, Set<string>>();
    for (const transacao of transacoes || []) {
      const desbravaId = transacao.points?.desbravadorId;
      const dataExtraida = (transacao.reason ? this.extractDateFromReason(transacao.reason) : null) || new Date(transacao.createdAt);
      const dataKey = this.formatDateKey(dataExtraida);
      if (!transacoesPorDesbravadorPorData.has(desbravaId)) transacoesPorDesbravadorPorData.set(desbravaId, new Set());
      transacoesPorDesbravadorPorData.get(desbravaId)!.add(dataKey);
    }

    const now = new Date();
    const lastSunday = this.getSundayEnd(now);
    
    let inicioData = new Date(2026, 1, 22); // 22 de fevereiro de 2026
    if (startDate) {
      inicioData = new Date(startDate);
    }

    const sundayPoints: Date[] = [];
    const d = new Date(inicioData);
    
    while (d <= lastSunday) {
      const sunday = new Date(d);
      const day = sunday.getDay();
      const diff = (7 - day) % 7;
      sunday.setDate(sunday.getDate() + diff);
      sunday.setHours(23, 59, 59, 999);
      sundayPoints.push(new Date(sunday));
      d.setDate(d.getDate() + 7);
    }

    const ausenciaPorDesbravador = new Map<number, number>();
    const ausenciasSequencia: string[] = [];
    for (const desbrav of desbravadores || []) {
      let ausencias = 0;
      let streak = 0;
      let maiorSequencia = 0;
      const datasComPontos = transacoesPorDesbravadorPorData.get(desbrav.id) ?? new Set();

      for (const sunday of sundayPoints) {
        const dataKey = this.formatDateKey(sunday);
        if (!datasComPontos.has(dataKey)) {
          ausencias += 1;
          streak += 1;
          if (streak > maiorSequencia) maiorSequencia = streak;
        } else {
          streak = 0;
        }
      }

      ausenciaPorDesbravador.set(desbrav.id, ausencias);
      if (maiorSequencia >= 3) {
        ausenciasSequencia.push(desbrav.name);
      }
    }

    const data = (desbravadores || [])
      .map((d: any) => [d.name, ausenciaPorDesbravador.get(d.id) ?? 0])
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    return { data, ausenciasSequencia };
  }
}
