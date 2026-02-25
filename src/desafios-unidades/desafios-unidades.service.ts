import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DesafiosUnidadesService {
  constructor(private supabase: SupabaseService) {}

  async all() {
    const { data, error } = await this.supabase.client
      .from('desafioUnidade')
      .select('*')
      .order('createdat', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async create(payload: any) {
    const insert = { ...payload };
    const { data, error } = await this.supabase.client.from('desafioUnidade').insert([insert]).select().limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  async submit(challengeId: string, payload: any) {
    // validate challenge exists
    const { data: challenge } = await this.supabase.client
      .from('desafioUnidade')
      .select('id, title, points')
      .eq('id', challengeId)
      .limit(1)
      .maybeSingle();
    if (!challenge) throw new NotFoundException('Challenge not found');

    // prevent duplicate submission from same unit for same challenge
    const unitId = payload.unitid || null;
    if (unitId) {
      const { data: existing } = await this.supabase.client
        .from('desafioUnidadeSubmissao')
        .select('id, aprovado, nota')
        .eq('desafiounidadeid', challengeId)
        .eq('unitid', unitId)
        .limit(1)
        .maybeSingle();
      if (existing) {
        // if any submission exists for this unit+challenge, disallow new submission
        throw new BadRequestException('Já existe submissão para esta unidade e desafio');
      }
    }

    const toInsert = {
      desafiounidadeid: challengeId,
      unitid: unitId,
      fileurl: payload.fileurl || null,
      comment: payload.comment || null,
      submetidopor: payload.submetidopor ?? null,
    };

    const { data, error } = await this.supabase.client
      .from('desafioUnidadeSubmissao')
      .insert([toInsert])
      .select()
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async pendingSubmissions() {
    // return only submissions that are not approved and not yet graded (nota IS NULL)
    const { data, error } = await this.supabase.client
      .from('desafioUnidadeSubmissao')
      .select('*, desafioUnidade(*)')
      .eq('aprovado', false)
      .is('nota', null)
      .order('createdat', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async submissionsForUnit(unitId?: string, userId?: string) {
    let query = this.supabase.client.from('desafioUnidadeSubmissao').select('*, desafioUnidade(*)').order('createdat', { ascending: false });
    if (unitId) query = query.eq('unitid', unitId);
    if (userId) query = query.eq('submetidopor', userId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async availableForUnit(unitId?: string) {
    // if no unit specified, return all challenges
    const { data: allChallenges, error: allErr } = await this.supabase.client.from('desafioUnidade').select('*').order('createdat', { ascending: false });
    if (allErr) throw allErr;

    if (!unitId) return allChallenges || [];

    const { data: subs, error: subsErr } = await this.supabase.client
      .from('desafioUnidadeSubmissao')
      .select('desafiounidadeid')
      .eq('unitid', unitId);
    if (subsErr) throw subsErr;

    const submittedIds = new Set((subs || []).map((s: any) => String(s.desafiounidadeid)));

    return (allChallenges || []).filter((c: any) => !submittedIds.has(String(c.id)));
  }

  async approveSubmission(submissionId: string, nota: number, aprovadorId?: string) {
    const { data: sub } = await this.supabase.client
      .from('desafioUnidadeSubmissao')
      .select('*')
      .eq('id', submissionId)
      .limit(1)
      .maybeSingle();
    if (!sub) throw new NotFoundException('Submission not found');

    const now = new Date().toISOString();

    const { data: updated, error: upErr } = await this.supabase.client
      .from('desafioUnidadeSubmissao')
      .update({ aprovado: true, nota: nota ?? null, aprovadorid: aprovadorId || null, dataaprovacao: now })
      .eq('id', submissionId)
      .select()
      .limit(1)
      .maybeSingle();

    if (upErr) throw upErr;

    // award points to unit if nota present and unitid exists
    if (nota != null && sub.unitid) {
      const reason = `Aprovação desafio ${sub.desafiounidadeid}`;
      await this.supabase.client.from('unit_points').insert([
        {
          unitid: sub.unitid,
          points: nota,
          reason,
          related_challenge_id: sub.desafiounidadeid,
          created_by: aprovadorId || null,
        },
      ]);
    }

    return updated;
  }
}
