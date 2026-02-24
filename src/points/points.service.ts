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

  async adjust(payload: { desbravadorId: number; amount: number; reason?: string; authorId?: number }) {
    // validate desbravador exists
    const { data: des } = await this.supabase.client.from('desbravador').select('id').eq('id', payload.desbravadorId).limit(1).maybeSingle();
    if (!des) throw new NotFoundException('Desbravador not found');

    // if authorId provided, validate user exists
    if (payload.authorId) {
      const { data: author } = await this.supabase.client.from('user').select('id').eq('id', payload.authorId).limit(1).maybeSingle();
      if (!author) throw new NotFoundException('Author user not found');
    }

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
      // update total by incrementing
      const newTotal = (existing.total || 0) + payload.amount;
      const { data: updated, error: updateError } = await this.supabase.client
        .from('points')
        .update({ total: newTotal, updatedAt: nowIso })
        .eq('id', existing.id)
        .select()
        .limit(1)
        .maybeSingle();
      if (updateError) throw updateError;
      pointsRow = updated;
    } else {
      // insert new points row
      const { data: inserted, error: insertError } = await this.supabase.client
        .from('points')
        .insert([{ desbravadorId: payload.desbravadorId, total: payload.amount, updatedAt: nowIso }])
        .select()
        .limit(1)
        .maybeSingle();
      if (insertError) throw insertError;
      pointsRow = inserted;
    }

    // insert transaction record referencing pointsRow.id
    const { data: tr, error: trError } = await this.supabase.client
      .from('pointsTransaction')
      .insert([
        {
          pointsId: pointsRow.id,
          amount: payload.amount,
          reason: payload.reason,
          authorId: payload.authorId || null,
        },
      ])
      .select()
      .limit(1)
      .maybeSingle();

    if (trError) throw trError;

    return { points: pointsRow, transaction: tr };
  }
}
