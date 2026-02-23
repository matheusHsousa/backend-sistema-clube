import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Supabase service role not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)');
    return null;
  }

  return createClient(url, key);
}

@Injectable()
export class SupabaseUploadService {
  private async uploadToBucket(bucket: string, path: string, buffer: Buffer, mime: string, metadata?: Record<string, any>) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new InternalServerErrorException('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mime,
      metadata: metadata ?? {},
      upsert: false,
    });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new InternalServerErrorException(error.message || 'Upload error');
    }

    const { data: signedData, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    if (signedError) {
      console.error('Supabase createSignedUrl error:', signedError);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl ?? null;
    }

    return signedData?.signedUrl ?? null;
  }

  async uploadAvatar(userId: string, buffer: Buffer, filename: string, mime: string) {
    const path = `${userId}/${Date.now()}_${filename}`;
    return this.uploadToBucket('avatars', path, buffer, mime, { userId });
  }

  async uploadFile(bucket: string, buffer: Buffer, filename: string, mime: string, folder?: string) {
    const prefix = folder ? `${folder}/` : '';
    const path = `${prefix}${Date.now()}_${filename}`;
    return this.uploadToBucket(bucket, path, buffer, mime);
  }
}
