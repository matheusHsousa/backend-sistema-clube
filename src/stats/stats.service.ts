import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Classe, Unidade } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

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
    const where: any = { instrutorId };
    if (start || end) {
      where.data = {};
      if (start) where.data.gte = new Date(start);
      if (end) where.data.lte = new Date(end);
    }

    const registros = await this.prisma.desbravadorRequisito.findMany({
      where,
      include: { desbravador: true, requisito: true }
    });

    // agrupar por requisito
    const map = new Map();
    for (const r of registros) {
      const key = r.requisitoId;
      if (!map.has(key)) map.set(key, { requisito: r.requisito, count: 0, desbravadores: [] });
      const entry = map.get(key);
      entry.count += 1;
      entry.desbravadores.push(r.desbravador);
    }

    return Array.from(map.values());
  }

  async instrutorClasseResumo(instrutorId: number) {
    const instrutor = await this.prisma.user.findUnique({
      where: { id: instrutorId },
      select: { classe: true }
    });

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

    const classeEntity = await this.prisma.classeEntity.findUnique({
      where: { nome: classe },
      include: { requisitos: true }
    });

    const desbravadores = await this.prisma.desbravador.findMany({
      where: { classe: classe as Classe },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const requisitosConcluidos = await this.prisma.desbravadorRequisito.findMany({
      where: { desbravador: { classe: classe as Classe } },
      select: { desbravadorId: true }
    });

    const requisitosPorDesbravador = new Map<number, number>();
    for (const req of requisitosConcluidos) {
      requisitosPorDesbravador.set(
        req.desbravadorId,
        (requisitosPorDesbravador.get(req.desbravadorId) ?? 0) + 1
      );
    }

    const totalRequisitos = classeEntity?.requisitos?.length ?? 0;
    const totalDesbravadores = desbravadores.length;
    const itensTotal = totalRequisitos * totalDesbravadores;
    const itensConcluidos = requisitosConcluidos.length;
    const progressoClasse = itensTotal > 0 ? (itensConcluidos / itensTotal) * 100 : 0;
    const progressoClasseRounded = Math.round(progressoClasse * 100) / 100;

    const desbravadoresData = desbravadores.map((d) => ({
      name: d.name,
      concluidos: requisitosPorDesbravador.get(d.id) ?? 0
    }));

    const desbravadoresPercent = desbravadores.map((d) => {
      const concluidos = requisitosPorDesbravador.get(d.id) ?? 0;
      const percentual = totalRequisitos > 0 ? (concluidos / totalRequisitos) * 100 : 0;
      return {
        name: d.name,
        percentual: Math.round(percentual * 100) / 100
      };
    });

    return {
      classe,
      progressoClasse: progressoClasseRounded,
      itensConcluidos,
      itensTotal,
      desbravadores: desbravadoresData,
      desbravadoresPercent
    };
  }

  // Conselheiro: pontuação por desbravador em unidade, média por unidade e melhor/pior
  async pointsSummaryForConselheiro(unidade: Unidade | string, start?: string, end?: string) {
    // buscar desbravadores da unidade
    const unitVal = unidade as Unidade;
    const des = await this.prisma.desbravador.findMany({ where: { unidade: unitVal } });
    const ids = des.map(d => d.id);

    // buscar points para esses desbravadores
    const points = await this.prisma.points.findMany({ where: { desbravadorId: { in: ids } }, include: { desbravador: true } });

    // média por unidade (comparação com outras unidades)
    const units = await this.prisma.desbravador.groupBy({ by: ['unidade'], _avg: { id: true } }).catch(() => []);

    // compute best/worst
    const sorted = points.slice().sort((a,b) => b.total - a.total);
    const best = sorted[0] ?? null;
    const worst = sorted[sorted.length-1] ?? null;

    return { points, best, worst, unitsAvg: units };
  }

  // Admin: stats por unidade e classe
  async adminOverview(start?: string, end?: string) {
    // total requisitos aprovados por unidade/classe
    const aprovados = await this.prisma.desbravadorRequisito.groupBy({ by: ['desbravadorId'], _count: { id: true } });

    // pontos agregados por unidade/classe
    const pts = await this.prisma.points.findMany({ include: { desbravador: true } });

    return { aprovados, pts };
  }

  async adminDesbravadoresUnidadeSemanal(weeks = 12) {
    const desbravadores = await this.prisma.desbravador.findMany({
      select: { unidade: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const unidades = Object.values(Unidade);
    const totals = unidades.reduce((acc, unidade) => {
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

    let pointer = 0;
    const rows = sundayPoints.map((sunday) => {
      while (pointer < desbravadores.length && desbravadores[pointer].createdAt <= sunday) {
        const unidade = desbravadores[pointer].unidade;
        totals[unidade] = (totals[unidade] ?? 0) + 1;
        pointer += 1;
      }

      const values = unidades.reduce((acc, unidade) => {
        acc[unidade] = totals[unidade] ?? 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        date: this.formatDateKey(sunday),
        values
      };
    });

    return {
      unidades,
      rows
    };
  }

  async adminRequisitosPorClasse() {
    const requisitos = await this.prisma.desbravadorRequisito.findMany({
      include: { desbravador: true }
    });

    const classeMap = new Map<string, Set<number>>();
    for (const req of requisitos) {
      const classe = req?.desbravador?.classe;
      if (!classe) continue;
      if (!classeMap.has(classe)) classeMap.set(classe, new Set());
      classeMap.get(classe)!.add(req.desbravadorId);
    }

    const data = Array.from(classeMap.entries())
      .map(([classe, desbravadores]) => [classe, desbravadores.size])
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    return { data };
  }

  async adminProgressoClasses() {
    const classeEntities = await this.prisma.classeEntity.findMany({
      include: { requisitos: true }
    });

    const desbravadores = await this.prisma.desbravador.findMany({
      select: { id: true, classe: true }
    });

    const requisitosCompletos = await this.prisma.desbravadorRequisito.findMany({
      select: { desbravadorId: true }
    });

    const requisitosPorDesbravador = new Map<number, number>();
    for (const req of requisitosCompletos) {
      requisitosPorDesbravador.set(
        req.desbravadorId,
        (requisitosPorDesbravador.get(req.desbravadorId) ?? 0) + 1
      );
    }

    const data: Array<{ classe: string; progresso: number; itemsFeitos: number; itemsTotal: number; legenda: string }> = [];

    for (const classeEntity of classeEntities) {
      const nomeSqlite = classeEntity.nome;
      const desbravadoresDaClasse = desbravadores.filter(
        (d) => d.classe === nomeSqlite
      );

      const totalRequisitos = classeEntity.requisitos.length || 1;
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
      
      data.push({
        classe: nomeSqlite,
        progresso: percentualRounded,
        itemsFeitos: totalItemsFeitos,
        itemsTotal: itemsTotal,
        legenda: `${totalItemsFeitos}/${itemsTotal} - ${percentualItensRounded}%`
      });
    }

    return { data: data.sort((a, b) => b.progresso - a.progresso) };
  }

  async conselheiropontuacaoSemanal(unidade: string, weeks = 12) {
    const desbravadores = await this.prisma.desbravador.findMany({
      where: { unidade: unidade as Unidade },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const transacoes = await this.prisma.pointsTransaction.findMany({
      where: { points: { desbravador: { unidade: unidade as Unidade } } },
      include: { points: { select: { desbravadorId: true } } },
      orderBy: { reason: 'asc' }
    });

    const acumuladoPorDesbravador = new Map<number, number>();
    const transacoesPorDesbravador = new Map<number, Array<{ data: Date; amount: number }>>();

    for (const transacao of transacoes) {
      const desbravaId = transacao.points.desbravadorId;
      const amount = transacao.amount;
      const dataExtraida = (transacao.reason ? this.extractDateFromReason(transacao.reason) : null) || transacao.createdAt;

      acumuladoPorDesbravador.set(
        desbravaId,
        (acumuladoPorDesbravador.get(desbravaId) ?? 0) + amount
      );

      if (!transacoesPorDesbravador.has(desbravaId)) {
        transacoesPorDesbravador.set(desbravaId, []);
      }
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

      for (const desbrav of desbravadores) {
        const transacoesDesbrav = transacoesPorDesbravador.get(desbrav.id) ?? [];
        let acumulado = 0;

        for (const trans of transacoesDesbrav) {
          if (trans.data <= sunday) {
            acumulado += trans.amount;
          }
        }

        row[desbrav.name] = acumulado;
      }

      return row;
    });

    return {
      desbravadores: desbravadores.map((d) => d.name),
      rows
    };
  }

  async conselheiroBestWorstDesbravador(unidade: string, weeks = 12) {
    const desbravadores = await this.prisma.desbravador.findMany({
      where: { unidade: unidade as Unidade },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const transacoes = await this.prisma.pointsTransaction.findMany({
      where: { points: { desbravador: { unidade: unidade as Unidade } } },
      include: { points: { select: { desbravadorId: true } } },
      orderBy: { reason: 'asc' }
    });

    const acumuladoPorDesbravador = new Map<number, number>();
    const transacoesPorDesbravador = new Map<number, Array<{ data: Date; amount: number }>>();

    for (const transacao of transacoes) {
      const desbravaId = transacao.points.desbravadorId;
      const amount = transacao.amount;
      const dataExtraida = (transacao.reason ? this.extractDateFromReason(transacao.reason) : null) || transacao.createdAt;

      acumuladoPorDesbravador.set(
        desbravaId,
        (acumuladoPorDesbravador.get(desbravaId) ?? 0) + amount
      );

      if (!transacoesPorDesbravador.has(desbravaId)) {
        transacoesPorDesbravador.set(desbravaId, []);
      }
      transacoesPorDesbravador.get(desbravaId)!.push({ data: dataExtraida, amount });
    }

    let bestDesbravador: string | null = null;
    let worstDesbravador: string | null = null;
    let maxPontos = -Infinity;
    let minPontos = Infinity;

    for (const desbrav of desbravadores) {
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
        const desbravBest = desbravadores.find((d) => d.name === bestDesbravador);
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
        const desbravWorst = desbravadores.find((d) => d.name === worstDesbravador);
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
    const desbravadores = await this.prisma.desbravador.findMany({
      where: { unidade: unidade as Unidade },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const transacoes = await this.prisma.pointsTransaction.findMany({
      where: { points: { desbravador: { unidade: unidade as Unidade } } },
      include: { points: { select: { desbravadorId: true } } },
      orderBy: { reason: 'asc' }
    });

    const transacoesPorDesbravadorPorData = new Map<number, Set<string>>();

    for (const transacao of transacoes) {
      const desbravaId = transacao.points.desbravadorId;
      const dataExtraida = (transacao.reason ? this.extractDateFromReason(transacao.reason) : null) || transacao.createdAt;
      const dataKey = this.formatDateKey(dataExtraida);

      if (!transacoesPorDesbravadorPorData.has(desbravaId)) {
        transacoesPorDesbravadorPorData.set(desbravaId, new Set());
      }
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
    for (const desbrav of desbravadores) {
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

    const data = desbravadores
      .map((d) => [d.name, ausenciaPorDesbravador.get(d.id) ?? 0])
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    return { data, ausenciasSequencia };
  }
}
