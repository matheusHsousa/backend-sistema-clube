// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService, private firebaseService: FirebaseService) {}

  async validateUser(token: string) {
    try {
      const decodedToken = await this.firebaseService.verifyToken(token);
      const backendUser = await this.handleUser(decodedToken);
      return backendUser;
    } catch (err) {
      console.error('❌ Erro ao validar token Firebase:', err);
      // Repassa o erro para o guard alcançar logs/response reais
      throw err;
    }
  }

  async handleUser(firebaseUser: any) {
    console.log('🔥 Firebase user recebido:', firebaseUser);

    try {
      const { data: existing } = await this.supabase.client
        .from('user')
        .select('*')
        .eq('firebaseUid', firebaseUser.uid)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        console.log('🆕 Usuário novo, criando...');
        const unidade = (firebaseUser.unidade || firebaseUser.claims?.unidade) ?? null;
        const classe = (firebaseUser.classe || firebaseUser.claims?.classe) ?? null;

        const { data: created } = await this.supabase.client
          .from('user')
          .insert([
            {
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.name,
              roles: ['CONSELHEIRO'],
              unidade,
              classe,
            },
          ])
          .select()
          .limit(1)
          .maybeSingle();

        return created;
      }

      // update unidade/classe if present in claims
      const unidade = (firebaseUser.unidade || firebaseUser.claims?.unidade) ?? undefined;
      const classe = (firebaseUser.classe || firebaseUser.claims?.classe) ?? undefined;
      if (unidade !== undefined || classe !== undefined) {
        const updateData: any = {};
        if (unidade !== undefined) updateData.unidade = unidade;
        if (classe !== undefined) updateData.classe = classe;
        const { data: updated } = await this.supabase.client
          .from('user')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .limit(1)
          .maybeSingle();
        return updated || existing;
      }

      return existing;
    } catch (err) {
      console.error('🔥 ERRO ao buscar/criar usuário:', err);
      throw err;
    }
  }
}
