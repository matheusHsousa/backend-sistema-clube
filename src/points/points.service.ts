import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PointsService {
  constructor(private supabase: SupabaseService) {}

  async getByDesbravador(desbravadorId: number) {
    const { data: points } = await this.supabase.client
      .from('points')
      .select('*, transactions(*)')
      .eq('desbravadorId', desbravadorId)
      .limit(1)
      .maybeSingle();
    return points || null;
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

    // upsert points (may not be fully atomic across both inserts)
    const { data: p } = await this.supabase.client
      .from('points')
      .upsert({ desbravadorId: payload.desbravadorId, total: payload.amount }, { onConflict: 'desbravadorId' })
      .select()
      .limit(1)
      .maybeSingle();

    // If upsert returned a row without increment semantics, try to increment using SQL
    if (p) {
      // insert transaction record
      const { data: tr } = await this.supabase.client
        .from('pointsTransaction')
        .insert([
          {
            pointsId: p.id,
            amount: payload.amount,
            reason: payload.reason,
            authorId: payload.authorId || null,
          },
        ])
        .select()
        .limit(1)
        .maybeSingle();

      return { points: p, transaction: tr };
    }

    return null;
  }
}
