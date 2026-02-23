import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  onModuleInit() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
      // eslint-disable-next-line no-console
      console.warn('Supabase credentials missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return;
    }
    this.supabase = createClient(url, key, { auth: { persistSession: false } });
  }

  get client() {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }
    return this.supabase;
  }

  // helper to run selects with exact count when needed
  async count(table: string, filter?: Record<string, any>) {
    let query = this.client.from(table).select('id', { count: 'exact', head: false });
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => query = query.eq(k, v));
    }
    const { count } = await query;
    return typeof count === 'number' ? count : 0;
  }
}
