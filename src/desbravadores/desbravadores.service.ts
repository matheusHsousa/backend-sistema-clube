import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DesbravadoresService {
  constructor(private supabase: SupabaseService) {}

  async create(data: { name: string; birthDate?: string; unidade: string; classe: string }) {
    const payload: any = {
      name: data.name,
      unidade: data.unidade,
      classe: data.classe,
    };
    if (data.birthDate) payload.birthDate = new Date(data.birthDate);

    const { data: created } = await this.supabase.client.from('desbravador').insert([payload]).select().limit(1).maybeSingle();
    return created;
  }

  async findAll(filter?: { unidade?: string; classe?: string }) {
    let q = this.supabase.client.from('desbravador').select('*').order('name', { ascending: true });
    if (filter?.unidade) q = q.eq('unidade', filter.unidade);
    if (filter?.classe) q = q.eq('classe', filter.classe);
    const { data } = await q;
    return data || [];
  }

  async findOne(id: number) {
    const { data } = await this.supabase.client.from('desbravador').select('*').eq('id', id).limit(1).maybeSingle();
    return data || null;
  }

  async update(id: number, data: { name?: string; birthDate?: string; unidade?: string; classe?: string }) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.birthDate !== undefined) payload.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (data.unidade !== undefined) payload.unidade = data.unidade;
    if (data.classe !== undefined) payload.classe = data.classe;

    const { data: updated } = await this.supabase.client.from('desbravador').update(payload).eq('id', id).select().limit(1).maybeSingle();
    return updated;
  }

  async remove(id: number) {
    const { data } = await this.supabase.client.from('desbravador').delete().eq('id', id).select();
    return data ? data[0] : null;
  }
}
