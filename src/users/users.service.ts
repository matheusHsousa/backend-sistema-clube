import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data } = await this.supabase.client
      .from('User')
      .select('id, email, name, roles, unidade, classe, createdAt')
      .order('email', { ascending: true });
    return data || [];
  }

  async findByRole(role: string) {
    // roles is stored as text[] in Postgres; use cs/contains operator via filter
    const { data } = await this.supabase.client
      .from('User')
      .select('id, email, name, roles, unidade, classe, createdAt')
      .contains('roles', [role])
      .order('email', { ascending: true });
    return data || [];
  }

  async findInstrutores() {
    return this.findByRole('INSTRUTOR');
  }

  async findConselheiros() {
    return this.findByRole('CONSELHEIRO');
  }

  async update(id: number, data: { name?: string; roles?: string[]; unidade?: string | null; classe?: string | null }) {
    const { data: updated } = await this.supabase.client.from('User').update(data).eq('id', id).select().limit(1).maybeSingle();
    return updated;
  }

  async updateProfile(id: number, data: { name?: string; avatarUrl?: string }) {
    const { data: updated } = await this.supabase.client
      .from('User')
      .update(data)
      .eq('id', id)
      .select('id, email, name, avatarUrl, roles, unidade, classe')
      .limit(1)
      .maybeSingle();
    return updated;
  }
}

