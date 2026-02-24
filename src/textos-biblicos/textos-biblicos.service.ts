import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TextosBiblicosService {
  private readonly logger = new Logger(TextosBiblicosService.name);

  constructor(private supabase: SupabaseService) {}

  async listarDevedores() {
    const { data: atrasados } = await this.supabase.client
      .from('atrasado')
      .select('*, user(id, name, email), desbravador(id, name, unidade, classe), textoBiblico(*)');

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
      const aprovados = (atrasado.textoBiblico || []).filter((t: any) => t.aprovado).length;
      const pendentesEnviados = (atrasado.textoBiblico || []).filter((t: any) => !t.aprovado).length;
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
    // buscarAtrasadosPessoa

    try {
      if (desbravadorId) {
        const { data, error } = await this.supabase.client
          .from('atrasado')
          .select('*, textoBiblico(*), desbravador(*), user(*)')
          .eq('desbravadorId', desbravadorId)
          .order('data', { ascending: false });
        // error handled by caller
        return data || [];
      }

      if (userId) {
        const { data: user } = await this.supabase.client.from('user').select('id, roles, unidade').eq('id', userId).limit(1).maybeSingle();
        if (user && Array.isArray(user.roles) && user.roles.includes('CONSELHEIRO') && user.unidade) {
          const { data: desIds } = await this.supabase.client.from('desbravador').select('id').eq('unidade', user.unidade);
          const ids = (desIds || []).map((d: any) => d.id);
          const normalizedIds = ids.map((v: any) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v));
          if (ids.length === 0) return [];

          let { data: atrasados, error: atrasadosError } = await this.supabase.client
            .from('atrasado')
            .select('*, textoBiblico(*), desbravador(*), user(*)')
            .in('desbravadorId', normalizedIds)
            .order('data', { ascending: false });


          // If no rows returned, try stringified ids (handles text/varchar FK cases)
          if ((atrasados || []).length === 0) {
            try {
              const stringIds = normalizedIds.map((v: any) => String(v));
              const res = await this.supabase.client
                .from('atrasado')
                .select('*, textoBiblico(*), desbravador(*), user(*)')
                .in('desbravadorId', stringIds)
                .order('data', { ascending: false });
              atrasados = res.data;
            } catch (e) {
              // ignore retry errors
            }
          }

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
            const aprovados = (atrasado.textoBiblico || []).filter((t: any) => t.aprovado).length;
            const pendentesEnviados = (atrasado.textoBiblico || []).filter((t: any) => !t.aprovado).length;
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
          .select('*, textoBiblico(*), desbravador(*), user(*)')
          .eq('userId', userId)
          .order('data', { ascending: false });

        return data || [];
      }

      return [];
    } catch (err) {
      this.logger.error('Erro em buscarAtrasadosPessoa', err as any);
      throw err;
    }
  }
}
