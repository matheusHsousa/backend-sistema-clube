import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TextosBiblicosService {
  constructor(private supabase: SupabaseService) {}

  async listarDevedores() {
    const { data: atrasados } = await this.supabase.client
      .from('atrasado')
      .select('*, user(id, name, email), desbravador(id, name, unidade, classe), textosBiblicos(*)');

    const rows = atrasados || [];
    const devedoresMap = new Map<string, any>();

    for (const atrasado of rows) {
      const key = atrasado.userId ? `user-${atrasado.userId}` : `desbravador-${atrasado.desbravadorId}`;
      if (!devedoresMap.has(key)) {
        devedoresMap.set(key, {
          tipo: atrasado.userId ? 'usuario' : 'desbravador',
          pessoa: atrasado.user || atrasado.desbravador,
          totalAtrasados: 0,
          textosAprovados: 0,
          atrasadosIds: [],
        });
      }

      const devedor = devedoresMap.get(key);
      devedor.totalAtrasados++;
      const aprovados = (atrasado.textosBiblicos || []).filter((t: any) => t.aprovado).length;
      const pendentesEnviados = (atrasado.textosBiblicos || []).filter((t: any) => !t.aprovado).length;
      devedor.textosAprovados += aprovados;
      devedor.textosPendentesEnviados = (devedor.textosPendentesEnviados || 0) + pendentesEnviados;
      devedor.atrasadosIds.push(atrasado.id);
    }

    const devedores = Array.from(devedoresMap.values())
      .map((d: any) => {
        const aprovados = d.textosAprovados || 0;
        const enviados = d.textosPendentesEnviados || 0;
        const efetivo = d.totalAtrasados - aprovados - enviados;
        return {
          ...d,
          textosPendentes: Math.max(0, efetivo),
          textosAprovados: aprovados,
          textosPendentesEnviados: enviados,
        };
      })
      .filter((d: any) => d.textosPendentes > 0);

    return devedores;
  }

  async listarTextosPendentes() {
    const { data } = await this.supabase.client
      .from('textoBiblico')
      .select('*, atrasado(user(id, name), desbravador(id, name))')
      .eq('aprovado', false)
      .order('dataEnvio', { ascending: true });

    return data || [];
  }

  async enviarTexto(atrasadoId: number, imagemUrl: string) {
    const { data } = await this.supabase.client
      .from('textoBiblico')
      .insert([{ atrasadoId, imagemUrl }])
      .select('*, atrasado(user(*), desbravador(*))')
      .limit(1)
      .maybeSingle();

    return data;
  }

  async aprovarTexto(textoId: number, aprovadorId: number) {
    const { data } = await this.supabase.client
      .from('textoBiblico')
      .update({ aprovado: true, dataAprovacao: new Date().toISOString(), aprovadorId })
      .eq('id', textoId)
      .select('*, atrasado(user(*), desbravador(*))')
      .limit(1)
      .maybeSingle();

    return data;
  }

  async rejeitarTexto(textoId: number) {
    const { data } = await this.supabase.client.from('textoBiblico').delete().eq('id', textoId).select().limit(1).maybeSingle();
    return data;
  }

  async buscarAtrasadosPessoa(userId?: number, desbravadorId?: number) {
    if (desbravadorId) {
      const { data } = await this.supabase.client
        .from('atrasado')
        .select('*, textosBiblicos(*), desbravador(*), user(*)')
        .eq('desbravadorId', desbravadorId)
        .order('data', { ascending: false });
      return data || [];
    }

    if (userId) {
      const { data: user } = await this.supabase.client.from('User').select('id, roles, unidade').eq('id', userId).limit(1).maybeSingle();
      if (user && Array.isArray(user.roles) && user.roles.includes('CONSELHEIRO') && user.unidade) {
        const { data: desIds } = await this.supabase.client.from('desbravador').select('id').eq('unidade', user.unidade);
        const ids = (desIds || []).map((d: any) => d.id);
        if (ids.length === 0) return [];

        const { data: atrasados } = await this.supabase.client
          .from('atrasado')
          .select('*, textosBiblicos(*), desbravador(*), user(*)')
          .in('desbravadorId', ids)
          .order('data', { ascending: false });

        // Aggregate into same devedores contract as listarDevedores
        const devedoresMap = new Map<string, any>();
        for (const atrasado of atrasados || []) {
          const key = atrasado.userId ? `user-${atrasado.userId}` : `desbravador-${atrasado.desbravadorId}`;
          if (!devedoresMap.has(key)) {
            devedoresMap.set(key, {
              tipo: atrasado.userId ? 'usuario' : 'desbravador',
              pessoa: atrasado.user || atrasado.desbravador,
              totalAtrasados: 0,
              textosAprovados: 0,
              atrasadosIds: [],
            });
          }

          const devedor = devedoresMap.get(key);
          devedor.totalAtrasados++;
          const aprovados = (atrasado.textosBiblicos || []).filter((t: any) => t.aprovado).length;
          const pendentesEnviados = (atrasado.textosBiblicos || []).filter((t: any) => !t.aprovado).length;
          devedor.textosAprovados += aprovados;
          devedor.textosPendentesEnviados = (devedor.textosPendentesEnviados || 0) + pendentesEnviados;
          devedor.atrasadosIds.push(atrasado.id);
        }

        const devedores = Array.from(devedoresMap.values())
          .map((d: any) => {
            const aprovados = d.textosAprovados || 0;
            const enviados = d.textosPendentesEnviados || 0;
            const efetivo = d.totalAtrasados - aprovados - enviados;
            return {
              ...d,
              textosPendentes: Math.max(0, efetivo),
              textosAprovados: aprovados,
              textosPendentesEnviados: enviados,
            };
          })
          .filter((d: any) => d.textosPendentes > 0);

        return devedores;
      }

      const { data } = await this.supabase.client
        .from('atrasado')
        .select('*, textosBiblicos(*), desbravador(*), user(*)')
        .eq('userId', userId)
        .order('data', { ascending: false });

      return data || [];
    }

    return [];
  }
}
