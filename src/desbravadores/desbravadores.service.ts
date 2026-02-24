import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DesbravadoresService {
  constructor(private supabase: SupabaseService) {}

  async create(data: { name: string; birthDate?: string; unidade: string; classe: string }) {
    if (!data || !data.name || !data.unidade || !data.classe) {
      throw new BadRequestException('Campos obrigatórios: name, unidade, classe');
    }

    const payload: any = {
      name: data.name,
      unidade: data.unidade,
      classe: data.classe,
    };
    if (data.birthDate) {
      const d = new Date(data.birthDate);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('birthDate inválida');
      payload.birthDate = d;
    }

    const resp = await this.supabase.client.from('desbravador').insert([payload]).select().limit(1).maybeSingle();
    if ((resp as any).error) {
      // inclui mais contexto no log/erro para facilitar diagnóstico
      throw new InternalServerErrorException(`Supabase insert error: ${((resp as any).error?.message) || 'unknown'}`);
    }
    return (resp as any).data ?? null;
  }

  async findAll(filter?: { unidade?: string; classe?: string }) {
    let q = this.supabase.client.from('desbravador').select('*').order('name', { ascending: true });
    if (filter?.unidade) q = q.eq('unidade', filter.unidade);
    if (filter?.classe) q = q.eq('classe', filter.classe);
    const resp = await q;
    if ((resp as any).error) throw new InternalServerErrorException('Erro ao buscar desbravadores');
    return (resp as any).data || [];
  }

  async findOne(id: number) {
    const resp = await this.supabase.client.from('desbravador').select('*').eq('id', id).limit(1).maybeSingle();
    if ((resp as any).error) throw new InternalServerErrorException('Erro ao buscar desbravador');
    return (resp as any).data || null;
  }

  async update(id: number, data: { name?: string; birthDate?: string; unidade?: string; classe?: string }) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.birthDate !== undefined) payload.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (data.unidade !== undefined) payload.unidade = data.unidade;
    if (data.classe !== undefined) payload.classe = data.classe;

    const resp = await this.supabase.client.from('desbravador').update(payload).eq('id', id).select().limit(1).maybeSingle();
    if ((resp as any).error) throw new InternalServerErrorException('Erro ao atualizar desbravador');
    return (resp as any).data || null;
  }

  async remove(id: number) {
    try {
      const client = this.supabase.client;

      // delete points transactions -> points
      const { data: points } = await client.from('points').select('id').eq('desbravadorId', id);
      if (points && (points as any).length) {
        const pIds = (points as any).map((p: any) => p.id).filter(Boolean);
        if (pIds.length) {
          await client.from('pointsTransaction').delete().in('pointsId', pIds);
          await client.from('points').delete().in('id', pIds);
        }
      }

      // delete textos -> atrasado
      const { data: atrasados } = await client.from('atrasado').select('id').eq('desbravadorId', id);
      if (atrasados && (atrasados as any).length) {
        const aIds = (atrasados as any).map((a: any) => a.id).filter(Boolean);
        if (aIds.length) {
          await client.from('textoBiblico').delete().in('atrasadoId', aIds);
          await client.from('atrasado').delete().in('id', aIds);
        }
      }

      // delete requisitos
      await client.from('desbravadorRequisito').delete().eq('desbravadorId', id);

      // finally delete desbravador
      const resp = await client.from('desbravador').delete().eq('id', id).select();
      if ((resp as any).error) throw new InternalServerErrorException(`Erro ao deletar desbravador: ${((resp as any).error?.message) || 'unknown'}`);
      const data = (resp as any).data;
      return data ? data[0] : null;
    } catch (err: any) {
      throw new InternalServerErrorException(err?.message || 'Erro ao deletar desbravador');
    }
  }
}
