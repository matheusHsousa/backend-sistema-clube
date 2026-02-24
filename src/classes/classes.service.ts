import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);
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
      .select('*, desbravador(*), instrutor:user(*)')
      .in('requisitoId', requisitoIds);

    if (desbravadorId) progressoQuery = progressoQuery.eq('desbravadorId', desbravadorId);

    const { data: progresso, error: progressoError } = await progressoQuery;
    if (progressoError) this.logger.warn('getRequisitosByClass progresso query error', progressoError as any);
    let progressoRows = progresso || [];

    // If no rows found, retry with stringified requisito IDs (handles text FKs)
    if (progressoRows.length === 0) {
      try {
        const stringIds = requisitoIds.map((v: any) => String(v));
        let retryQuery = this.supabase.client
          .from('desbravadorRequisito')
          .select('*, desbravador(*), instrutor:user(*)')
          .in('requisitoId', stringIds);
        if (desbravadorId) retryQuery = retryQuery.eq('desbravadorId', desbravadorId);
        const { data: progresso2, error: progresso2Error } = await retryQuery;
        if (progresso2Error) this.logger.warn('getRequisitosByClass retry progresso query error', progresso2Error as any);
        if (progresso2) progressoRows = progresso2;
      } catch (e) {
        // ignore retry errors
      }
    }

    // attach progresso to requisitos
    const map = new Map<number, any[]>();
    for (const p of progressoRows) {
      const key = Number(p.requisitoId);
      const arr = map.get(key) || [];
      arr.push(p);
      map.set(key, arr);
    }

    this.logger.debug(`getRequisitosByClass classeId=${classeId} desbravadorId=${desbravadorId} requisitoIds=${JSON.stringify(
      requisitoIds,
    )} progressoRows=${progressoRows.length}`);

    return reqs.map((r: any) => ({ ...r, progresso: map.get(Number(r.id)) || [] }));
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
