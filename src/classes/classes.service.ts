import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ClassesService {
  constructor(private supabase: SupabaseService) {}

  async getRequisitosByClass(classeId: number, desbravadorId?: number) {
    const { data: requisitos } = await this.supabase.client
      .from('classeRequisito')
      .select('*')
      .eq('classeId', classeId)
      .order('ordem', { ascending: true });

    const reqs = requisitos || [];
    const requisitoIds = reqs.map((r: any) => r.id);

    if (requisitoIds.length === 0) return reqs;

    let progressoQuery = this.supabase.client
      .from('desbravadorRequisito')
      .select('*, desbravador(*), instrutor(*)')
      .in('requisitoId', requisitoIds);

    if (desbravadorId) progressoQuery = progressoQuery.eq('desbravadorId', desbravadorId);

    const { data: progresso } = await progressoQuery;
    const progressoRows = progresso || [];

    // attach progresso to requisitos
    const map = new Map<number, any[]>();
    for (const p of progressoRows) {
      const arr = map.get(p.requisitoId) || [];
      arr.push(p);
      map.set(p.requisitoId, arr);
    }

    return reqs.map((r: any) => ({ ...r, progresso: map.get(r.id) || [] }));
  }

  async listClasses() {
    const { data } = await this.supabase.client.from('classeEntity').select('*').order('ordem', { ascending: true });
    return data || [];
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
      const { data: exists } = await this.supabase.client
        .from('desbravadorRequisito')
        .select('id, *')
        .match({ desbravadorId: dId, requisitoId: payload.requisitoId })
        .limit(1)
        .maybeSingle();

      if (exists) {
        created.push(exists);
        continue;
      }

      const { data: item } = await this.supabase.client
        .from('desbravadorRequisito')
        .insert([
          {
            desbravadorId: dId,
            requisitoId: payload.requisitoId,
            instrutorId: payload.instrutorId || undefined,
            data: when,
            observacao: payload.observacao,
            concluido: true,
          },
        ])
        .select()
        .limit(1)
        .maybeSingle();

      if (item) created.push(item);
    }

    return created;
  }

  async desmarcarRequisitos(payload: { requisitoId: number; desbravadores?: number[] }) {
    const { requisitoId, desbravadores } = payload;
    let q = this.supabase.client.from('desbravadorRequisito').delete();
    if (desbravadores && desbravadores.length) {
      q = q.in('desbravadorId', desbravadores).eq('requisitoId', requisitoId);
    } else {
      q = q.eq('requisitoId', requisitoId);
    }

    const res: any = await q;
    const data = res?.data;
    return { deleted: Array.isArray(data) ? data.length : 0 };
  }
}
