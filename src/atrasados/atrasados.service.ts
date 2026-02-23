import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AtrasadosService {
  constructor(private supabase: SupabaseService) {}

  async marcarAtrasado(userId?: number, desbravadorId?: number, observacao?: string) {
    if (!userId && !desbravadorId) {
      throw new Error('É necessário fornecer userId ou desbravadorId');
    }

    const payload: any = {
      userId: userId || null,
      desbravadorId: desbravadorId || null,
      observacao,
    };

    const { data: atrasado } = await this.supabase.client
      .from('atrasado')
      .insert([payload])
      .select('*, user(id, name, email, roles), desbravador(id, name, unidade, classe)')
      .limit(1)
      .maybeSingle();

    if (desbravadorId) {
      await this.removerPontosAtrasado(desbravadorId);
    }

    return atrasado;
  }

  async removerPontosAtrasado(desbravadorId: number) {
    const { data: points } = await this.supabase.client.from('points').select('*').eq('desbravadorId', desbravadorId).limit(1).maybeSingle();

    if (points) {
      await this.supabase.client.from('pointsTransaction').insert([{ pointsId: points.id, amount: -1, type: 'ADJUST', reason: 'Atrasado' }]);
      const newTotal = Math.max(0, (points.total ?? 0) - 1);
      await this.supabase.client.from('points').update({ total: newTotal }).eq('desbravadorId', desbravadorId);
    } else {
      const { data: created } = await this.supabase.client
        .from('points')
        .insert([{ desbravadorId, total: 0 }])
        .select()
        .limit(1)
        .maybeSingle();

      if (created) {
        await this.supabase.client.from('pointsTransaction').insert([{ pointsId: created.id, amount: -1, type: 'ADJUST', reason: 'Atrasado' }]);
      }
    }
  }

  async removerAtrasado(atrasadoId: number) {
    const { data: atrasado } = await this.supabase.client
      .from('atrasado')
      .delete()
      .eq('id', atrasadoId)
      .select('*, desbravador(id)')
      .limit(1)
      .maybeSingle();

    if (atrasado?.desbravador?.id) {
      const desbravadorId = atrasado.desbravador.id;
      const { data: points } = await this.supabase.client.from('points').select('*').eq('desbravadorId', desbravadorId).limit(1).maybeSingle();

      if (points) {
        await this.supabase.client.from('pointsTransaction').insert([{ pointsId: points.id, amount: 1, type: 'ADJUST', reason: 'Atrasado removido' }]);
        await this.supabase.client.from('points').update({ total: (points.total ?? 0) + 1 }).eq('desbravadorId', desbravadorId);
      }
    }

    return atrasado;
  }

  async listarAtrasados(filtro?: { data?: Date; userId?: number; desbravadorId?: number }) {
    let q = this.supabase.client
      .from('atrasado')
      .select('*, user(id, name, email, roles), desbravador(id, name, unidade, classe)')
      .order('data', { ascending: false });

    if (filtro?.data) {
      const data = new Date(filtro.data);
      const ehDataValida = !Number.isNaN(data.getTime());
      if (ehDataValida) {
        const inicio = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), 0, 0, 0, 0));
        const fimExclusivo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() + 1, 0, 0, 0, 0));
        q = q.gte('data', inicio.toISOString()).lt('data', fimExclusivo.toISOString());
      }
    }

    if (filtro?.userId) q = q.eq('userId', filtro.userId);
    if (filtro?.desbravadorId) q = q.eq('desbravadorId', filtro.desbravadorId);

    const { data } = await q;
    return data || [];
  }

  async listarAtrasadosHoje() {
    return this.listarAtrasados({ data: new Date() });
  }

  async listarTodosUsuarios() {
    const { data } = await this.supabase.client.from('user').select('id, name, email, roles').order('name', { ascending: true });
    return data || [];
  }

  async listarTodosDesbravadores() {
    const { data } = await this.supabase.client.from('desbravador').select('id, name, unidade, classe').order('name', { ascending: true });
    return data || [];
  }
}
