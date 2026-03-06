import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PointsService {
  constructor(private supabase: SupabaseService) {}

  async getByDesbravador(desbravadorId: number) {
    try {
      const { data: points, error } = await this.supabase.client
        .from('points')
        .select('*, pointsTransaction(*)')
        .eq('desbravadorId', desbravadorId)
        .limit(1)
        .maybeSingle();

      if (error) return null;
      if (!points) return null;

      // normalize transactions property for callers
      const transactions = (points.pointsTransaction || []).slice();
      return { ...points, transactions };
    } catch (e) {
      return null;
    }
  }

  async getByDesbravadorBatch(desbravadorIds: number[]) {
    try {
      const { data: pointsRows, error } = await this.supabase.client
        .from('points')
        .select('*')
        .in('desbravadorId', desbravadorIds);
      if (error) throw error;
      const map: Record<number, any> = {};
      (pointsRows || []).forEach((r: any) => { map[Number(r.desbravadorId)] = r; });
      // ensure all ids present
      for (const id of desbravadorIds) { if (!map[id]) map[id] = { total: 0 }; }
      return map;
    } catch (e) {
      return {};
    }
  }

  async listTransactions(filter: { desbravadorId?: number; sundayDate?: string; unidade?: number }) {
    try {
      let q = this.supabase.client.from('pointsTransaction').select('*, points(*)');

      // If desbravadorId was provided, resolve the corresponding points.id(s)
      if (filter.desbravadorId) {
        const { data: pts, error: ptsErr } = await this.supabase.client
          .from('points')
          .select('id')
          .eq('desbravadorId', filter.desbravadorId);
        if (ptsErr) throw ptsErr;
        const pointIds = Array.isArray(pts) ? pts.map((p: any) => p.id) : [];
        if (!pointIds.length) return [];
        q = q.in('pointsId', pointIds);
      }

      // if unidade is provided (and desbravadorId wasn't), find desbravador ids for that unidade
      if (!filter.desbravadorId && filter.unidade) {
        const { data: desList, error: desErr } = await this.supabase.client
          .from('desbravador')
          .select('id')
          .eq('unidade', filter.unidade);
        if (desErr) throw desErr;
        const desIds = Array.isArray(desList) ? desList.map((d: any) => d.id) : [];
        if (!desIds.length) return [];
        // resolve points ids for those desbravador ids
        const { data: pts2, error: pts2Err } = await this.supabase.client
          .from('points')
          .select('id')
          .in('desbravadorId', desIds);
        if (pts2Err) throw pts2Err;
        const pointIds = Array.isArray(pts2) ? pts2.map((p: any) => p.id) : [];
        if (!pointIds.length) return [];
        q = q.in('pointsId', pointIds);
      }

      if (filter.sundayDate) q = q.eq('sundayDate', filter.sundayDate);

      const { data, error } = await q.order('sundayDate', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async editTransaction(id: number, payload: any) {
    // fetch existing transaction
    const { data: existing, error: exError } = await this.supabase.client
      .from('pointsTransaction')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (exError) throw exError;
    if (!existing) throw new NotFoundException('Transaction not found');

    // determine old values (prefer transaction values, but if they are null and
    // the `points` row stores values for the same sundayDate, use those)
    const criteriaFields = ['presence','pontualidade','uniforme','material','classe','espEquipe','disciplina','textoBiblico'];
    const oldCriteria: any = {};
    for (const k of criteriaFields) oldCriteria[k] = (typeof existing[k] === 'number' ? Number(existing[k]) : null);

    // compute new amount from provided criteria if present, otherwise from payload.amount
    const hasNewCriteria = criteriaFields.some((k) => typeof payload[k] === 'number');
    // compute new amount from provided criteria if present, otherwise from payload.amount
    const newAmount: number | null = hasNewCriteria
      ? criteriaFields.reduce((acc, k) => acc + (Number(payload[k]) || 0), 0)
      : (typeof payload.amount === 'number' ? Number(payload.amount) : null);

    // fetch points row to use as fallback for old criterion values when transaction lacks them
    const pointsId = existing.pointsId;
    const { data: pointsRow, error: pointsError } = await this.supabase.client
      .from('points')
      .select('*')
      .eq('id', pointsId)
      .limit(1)
      .maybeSingle();
    if (pointsError) throw pointsError;
    if (!pointsRow) throw new NotFoundException('Points row not found');

    // If the pointsRow.sundayDate matches the transaction's sundayDate, prefer
    // the stored per-criterion values from pointsRow when transaction fields are null.
    const sameSunday = pointsRow.sundayDate && existing.sundayDate && String(pointsRow.sundayDate) === String(existing.sundayDate);

    // calculate diffs per criterion, using fallback from pointsRow when needed
    const diffs: any = {};
    for (const k of criteriaFields) {
      const existingVal = oldCriteria[k];
      const fallback = sameSunday && typeof pointsRow[k] === 'number' ? Number(pointsRow[k]) : 0;
      const oldVal = typeof existingVal === 'number' ? existingVal : fallback;
      const newVal = typeof payload[k] === 'number' ? Number(payload[k]) : oldVal;
      diffs[k] = newVal - oldVal;
      oldCriteria[k] = oldVal; // normalize
    }

    // determine oldAmount: prefer transaction.amount if present, otherwise sum of oldCriteria
    const oldAmount = (typeof existing.amount === 'number' ? Number(existing.amount) : (Object.values(oldCriteria) as any[]).reduce((s: number, v: any) => s + (Number(v) || 0), 0));
    const finalNewAmount = newAmount !== null ? Number(newAmount) : (typeof payload.amount === 'number' ? Number(payload.amount) : (Object.values(oldCriteria) as any[]).reduce((s: number, v: any) => s + (Number(v) || 0), 0));
    const delta = Number(finalNewAmount) - Number(oldAmount);

    // update transaction row
    const updateTx: any = {};
    updateTx.amount = finalNewAmount;
    if (typeof payload.reason !== 'undefined') updateTx.reason = payload.reason;
    if (typeof payload.sundayDate !== 'undefined') updateTx.sundayDate = payload.sundayDate;
    for (const k of criteriaFields) if (typeof payload[k] === 'number') updateTx[k] = Number(payload[k]);

    const { data: updatedTx, error: updateTxError } = await this.supabase.client
      .from('pointsTransaction')
      .update(updateTx)
      .eq('id', id)
      .select()
      .limit(1)
      .maybeSingle();
    if (updateTxError) throw updateTxError;

    // reconcile points row totals (pointsRow was loaded earlier)
    const pointsUpdate: any = { total: (pointsRow.total || 0) + delta, updatedAt: new Date().toISOString() };
    for (const k of criteriaFields) {
      pointsUpdate[k] = (pointsRow[k] || 0) + (diffs[k] || 0);
    }

    const { data: updatedPoints, error: updatePointsError } = await this.supabase.client
      .from('points')
      .update(pointsUpdate)
      .eq('id', pointsId)
      .select()
      .limit(1)
      .maybeSingle();
    if (updatePointsError) throw updatePointsError;

    return { transaction: updatedTx, points: updatedPoints };
  }

  async adjust(payload: {
    desbravadorId: number;
    amount?: number;
    presence?: number;
    pontualidade?: number;
    uniforme?: number;
    material?: number;
    classe?: number;
    espEquipe?: number;
    disciplina?: number;
    textoBiblico?: number;
    reason?: string;
    authorId?: number;
    sundayDate?: string;
  }) {
    // validate desbravador exists
    const { data: des } = await this.supabase.client.from('desbravador').select('id').eq('id', payload.desbravadorId).limit(1).maybeSingle();
    if (!des) throw new NotFoundException('Desbravador not found');

    // if authorId provided, validate user exists
    if (payload.authorId) {
      const { data: author } = await this.supabase.client.from('user').select('id').eq('id', payload.authorId).limit(1).maybeSingle();
      if (!author) throw new NotFoundException('Author user not found');
    }

    // compute amount from provided criteria when available
    const criteriaFields = ['presence','pontualidade','uniforme','material','classe','espEquipe','disciplina','textoBiblico'];
    const hasCriteria = criteriaFields.some((k) => typeof (payload as any)[k] === 'number');
    const computedAmount = hasCriteria
      ? criteriaFields.reduce((acc, k) => acc + (Number((payload as any)[k]) || 0), 0)
      : (payload.amount || 0);

    // read existing points row
    const { data: existing, error: readError } = await this.supabase.client
      .from('points')
      .select('*')
      .eq('desbravadorId', payload.desbravadorId)
      .limit(1)
      .maybeSingle();

    if (readError) throw readError;

    let pointsRow: any = existing;

    const nowIso = new Date().toISOString();

    if (existing) {
      // update total and per-criterion columns by incrementing
      const newTotal = (existing.total || 0) + computedAmount;
      const updatePayload: any = {
        total: newTotal,
        updatedAt: nowIso,
        sundayDate: payload.sundayDate || null,
      };
      // increment per-criterion columns if provided
      for (const k of criteriaFields) {
        const val = Number((payload as any)[k]) || 0;
        updatePayload[k] = (existing[k] || 0) + val;
      }
      const { data: updated, error: updateError } = await this.supabase.client
        .from('points')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .limit(1)
        .maybeSingle();
      if (updateError) throw updateError;
      pointsRow = updated;
    } else {
      // insert new points row with per-criterion columns
      const insertPayload: any = {
        desbravadorId: payload.desbravadorId,
        total: computedAmount,
        updatedAt: nowIso,
        sundayDate: payload.sundayDate || null,
      };
      for (const k of criteriaFields) {
        insertPayload[k] = Number((payload as any)[k]) || 0;
      }
      const { data: inserted, error: insertError } = await this.supabase.client
        .from('points')
        .insert([insertPayload])
        .select()
        .limit(1)
        .maybeSingle();
      if (insertError) throw insertError;
      pointsRow = inserted;
    }

    // insert transaction record referencing pointsRow.id
    const trPayload: any = {
      pointsId: pointsRow.id,
      amount: computedAmount,
      reason: payload.reason,
      authorId: payload.authorId || null,
      sundayDate: payload.sundayDate || null,
    };
    // include per-criterion values on transaction
    for (const k of ['presence','pontualidade','uniforme','material','classe','espEquipe','disciplina','textoBiblico']) {
      if (typeof (payload as any)[k] === 'number') trPayload[k] = (payload as any)[k];
      else trPayload[k] = null;
    }

    const { data: tr, error: trError } = await this.supabase.client
      .from('pointsTransaction')
      .insert([trPayload])
      .select()
      .limit(1)
      .maybeSingle();

    if (trError) throw trError;

    return { points: pointsRow, transaction: tr };
  }

  async adjustBatch(payloads: Array<any>) {
    // Process payloads in parallel for better throughput. Return per-item results.
    const promises = payloads.map(async (p) => {
      try {
        const res = await this.adjust(p);
        return { success: true, result: res };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    });
    return Promise.all(promises);
  }
}
