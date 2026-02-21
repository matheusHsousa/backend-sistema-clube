import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // não imprime a chave por segurança
    // loga apenas para diagnóstico se as variáveis de ambiente existem
    // (reinicie o servidor após alterar o .env)
    // eslint-disable-next-line no-console
    console.error('Supabase service role not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)');
    return null;
  }

  // eslint-disable-next-line no-console
  console.log('Supabase service role configured');
  return createClient(url, key);
}

@Injectable()
export class SupabaseUploadService {
  async uploadAvatar(userId: string, buffer: Buffer, filename: string, mime: string) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new InternalServerErrorException('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const path = `${userId}/${Date.now()}_${filename}`;
    const { error } = await supabase.storage.from('avatars').upload(path, buffer, {
      contentType: mime,
      metadata: { userId },
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Supabase storage upload error:', error);
      throw new InternalServerErrorException(error.message || 'Upload error');
    }

    // Retorna uma URL assinada para garantir acesso imediato mesmo com bucket privado
    const { data: signedData, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
    if (signedError) {
      // eslint-disable-next-line no-console
      console.error('Supabase createSignedUrl error:', signedError);
      // Fallback: tenta retornar publicUrl
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return data?.publicUrl ?? null;
    }

    return signedData?.signedUrl ?? null;
  }
}
