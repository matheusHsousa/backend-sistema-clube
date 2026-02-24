import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
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

  // service role presence confirmed (no debug print)
  return createClient(url, key);
}

@Injectable()
export class SupabaseUploadService {
  private readonly logger = new Logger(SupabaseUploadService.name);
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

  async uploadTexto(atrasadoId: string, buffer: Buffer, filename: string, mime: string) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new InternalServerErrorException('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    // compute hash of file to produce deterministic filename and avoid duplicate uploads
    const hash = createHash('sha256').update(buffer).digest('hex');
    const storedName = `${hash}_${filename}`;
    const folder = String(atrasadoId);
    const path = `${folder}/${storedName}`;

    // check if file already exists in the folder
    try {
      const { data: listData, error: listErr } = await supabase.storage.from('textos-biblicos').list(folder);
      if (listErr) {
        this.logger.warn('list folder failed, will attempt upload', listErr);
      } else {
        const exists = (listData || []).some((f: any) => f.name === storedName);
        if (!exists) {
          const { error } = await supabase.storage.from('textos-biblicos').upload(path, buffer, {
            contentType: mime,
            metadata: { atrasadoId },
          });
          if (error) {
            this.logger.error('Supabase storage upload error', error as any);
            throw new InternalServerErrorException(error.message || 'Upload error');
          }
        }
      }

      const { data: signedData, error: signedError } = await supabase.storage.from('textos-biblicos').createSignedUrl(path, 60 * 60);
      if (signedError) {
        this.logger.warn('createSignedUrl failed, falling back to publicUrl', signedError);
        const { data } = supabase.storage.from('textos-biblicos').getPublicUrl(path);
        return data?.publicUrl ?? null;
      }

      return signedData?.signedUrl ?? null;
    } catch (e) {
      // fallback: try upload directly
      const { error } = await supabase.storage.from('textos-biblicos').upload(path, buffer, {
        contentType: mime,
        metadata: { atrasadoId },
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Supabase storage upload error (fallback):', error);
        throw new InternalServerErrorException(error.message || 'Upload error');
      }
      const { data: signedData } = await supabase.storage.from('textos-biblicos').createSignedUrl(path, 60 * 60);
      return signedData?.signedUrl ?? null;
    }
  }
}
