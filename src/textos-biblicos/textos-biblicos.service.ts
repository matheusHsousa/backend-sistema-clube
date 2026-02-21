import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TextosBiblicosService {
  constructor(private prisma: PrismaService) {}

  // Listar todos os devedores (pessoas com atrasados sem textos aprovados suficientes)
  async listarDevedores() {
    const atrasados = await this.prisma.atrasado.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        desbravador: {
          select: {
            id: true,
            name: true,
            unidade: true,
            classe: true,
          },
        },
        textosBiblicos: true, // trazer todos (aprovados e pendentes)
      },
    });

    // Agrupar por pessoa (userId ou desbravadorId)
    const devedoresMap = new Map();

    for (const atrasado of atrasados) {
      const key = atrasado.userId 
        ? `user-${atrasado.userId}` 
        : `desbravador-${atrasado.desbravadorId}`;

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
      // contar aprovados e pendentes
      const aprovados = atrasado.textosBiblicos.filter(t => t.aprovado).length;
      const pendentesEnviados = atrasado.textosBiblicos.filter(t => !t.aprovado).length;
      devedor.textosAprovados += aprovados;
      devedor.textosPendentesEnviados = (devedor.textosPendentesEnviados || 0) + pendentesEnviados;
      devedor.atrasadosIds.push(atrasado.id);
    }

    // Filtrar apenas quem está devendo (tem mais atrasados que textos aprovados)
    // Ajustar dívida considerando textos aprovados e textos já enviados (pendentes)
    const devedores = Array.from(devedoresMap.values())
      .map(d => {
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
      .filter(d => d.textosPendentes > 0);

    return devedores;
  }

  // Buscar textos pendentes de aprovação
  async listarTextosPendentes() {
    return this.prisma.textoBiblico.findMany({
      where: { aprovado: false },
      include: {
        atrasado: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            desbravador: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataEnvio: 'asc',
      },
    });
  }

  // Enviar texto bíblico
  async enviarTexto(atrasadoId: number, imagemUrl: string) {
    return this.prisma.textoBiblico.create({
      data: {
        atrasadoId,
        imagemUrl,
      },
      include: {
        atrasado: {
          include: {
            user: true,
            desbravador: true,
          },
        },
      },
    });
  }

  // Aprovar texto
  async aprovarTexto(textoId: number, aprovadorId: number) {
    return this.prisma.textoBiblico.update({
      where: { id: textoId },
      data: {
        aprovado: true,
        dataAprovacao: new Date(),
        aprovadorId,
      },
      include: {
        atrasado: {
          include: {
            user: true,
            desbravador: true,
          },
        },
      },
    });
  }

  // Rejeitar texto (deletar)
  async rejeitarTexto(textoId: number) {
    return this.prisma.textoBiblico.delete({
      where: { id: textoId },
    });
  }

  // Buscar atrasados de uma pessoa específica (para upload)
  async buscarAtrasadosPessoa(userId?: number, desbravadorId?: number) {
    // If desbravadorId is provided, return their atrasados
    if (desbravadorId) {
      return this.prisma.atrasado.findMany({
        where: { desbravadorId },
        include: { textosBiblicos: true, desbravador: true, user: true },
        orderBy: { data: 'desc' },
      });
    }

    // If userId is provided, check if the user is a CONSELHEIRO. If so,
    // return atrasados for desbravadores in the same unidade as the user.
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && Array.isArray(user.roles) && user.roles.includes('CONSELHEIRO') && user.unidade) {
        const atrasados = await this.prisma.atrasado.findMany({
          where: {
            desbravador: {
              is: {
                unidade: user.unidade,
              },
            },
          },
          include: { textosBiblicos: true, desbravador: true, user: true },
          orderBy: { data: 'desc' },
        });

        // Aggregate into same devedores contract as listarDevedores
        const devedoresMap = new Map();

        for (const atrasado of atrasados) {
          const key = atrasado.userId
            ? `user-${atrasado.userId}`
            : `desbravador-${atrasado.desbravadorId}`;

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
          const aprovados = atrasado.textosBiblicos.filter(t => t.aprovado).length;
          const pendentesEnviados = atrasado.textosBiblicos.filter(t => !t.aprovado).length;
          devedor.textosAprovados += aprovados;
          devedor.textosPendentesEnviados = (devedor.textosPendentesEnviados || 0) + pendentesEnviados;
          devedor.atrasadosIds.push(atrasado.id);
        }

        const devedores = Array.from(devedoresMap.values())
          .map(d => {
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
          .filter(d => d.textosPendentes > 0);

        return devedores;
      }

      // Otherwise, return atrasados where the user is linked (e.g., parent/guardian)
      return this.prisma.atrasado.findMany({
        where: { userId },
        include: { textosBiblicos: true, desbravador: true, user: true },
        orderBy: { data: 'desc' },
      });
    }

    // Fallback: return empty array
    return [];
  }
}
