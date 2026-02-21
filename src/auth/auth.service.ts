// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private firebaseService: FirebaseService) {}

  async validateUser(token: string) {
    try {
      const decodedToken = await this.firebaseService.verifyToken(token);
      // ao validar o token, busca/cria o usuário no banco e retorna o usuário do backend
      const backendUser = await this.handleUser(decodedToken);
      return backendUser;
    } catch (err) {
      console.error('❌ Token Firebase inválido', err);
      return null;
    }
  }

  async handleUser(firebaseUser: any): Promise<User> {
    console.log('🔥 Firebase user recebido:', firebaseUser);

    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { firebaseUid: firebaseUser.uid },
      });

      if (!user) {
        console.log('🆕 Usuário novo, criando...');

        // tenta extrair unidade/classe de custom claims ou do objeto firebaseUser
        const unidade = (firebaseUser.unidade || firebaseUser.claims?.unidade) ?? undefined;
        const classe = (firebaseUser.classe || firebaseUser.claims?.classe) ?? undefined;

        user = await (this.prisma as any).user.create({
          data: {
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.name,
            roles: ['CONSELHEIRO'],
            unidade: unidade,
            classe: classe,
          },
        });
      } else {
        console.log('✅ Usuário existente:', user.email);
        // se já existe, podemos tentar atualizar unidade/classe caso venham nas claims
        const unidade = (firebaseUser.unidade || firebaseUser.claims?.unidade) ?? undefined;
        const classe = (firebaseUser.classe || firebaseUser.claims?.classe) ?? undefined;
        if (unidade || classe) {
          await (this.prisma as any).user.update({ where: { id: user.id }, data: { unidade: unidade, classe: classe } });
        }
      }
    } catch (err) {
      console.error('🔥 ERRO ao buscar/criar usuário:', err);
      throw err;
    }

    return user;
  }
}
