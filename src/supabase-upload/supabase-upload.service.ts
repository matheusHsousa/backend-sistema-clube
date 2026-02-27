import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import * as os from 'os';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { spawnSync } from 'child_process';

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

    // Retorna a URL pública do objeto (bucket deve ser público)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl ?? null;
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

      // Retorna URL pública (bucket público)
      const { data: pub } = supabase.storage.from('textos-biblicos').getPublicUrl(path);
      return pub?.publicUrl ?? null;
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

  async uploadDesafio(challengeId: string, buffer: Buffer, filename: string, mime: string) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new InternalServerErrorException('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    // If a video, attempt to transcode to lower quality to save storage/bandwidth
    if (mime && mime.startsWith('video/')) {
      try {
        const trans = await this.transcodeVideo(buffer, filename);
        if (trans && trans.buffer) {
          buffer = trans.buffer;
          filename = trans.filename || filename.replace(/\.[^/.]+$/, '.mp4');
          mime = trans.mime || 'video/mp4';
        }
      } catch (e) {
        this.logger.warn('Video transcode failed, proceeding with original file', e as any);
        // proceed with original buffer
      }
    }

    // compute hash to avoid duplicate uploads
    const hash = createHash('sha256').update(buffer).digest('hex');
    const storedName = `${hash}_${filename}`;
    const folder = String(challengeId);
    const path = `${folder}/${storedName}`;

    try {
      const { data: listData, error: listErr } = await supabase.storage.from('desafios-unidades').list(folder);
      if (listErr) {
        this.logger.warn('list folder failed, will attempt upload', listErr);
      } else {
        const exists = (listData || []).some((f: any) => f.name === storedName);
        if (!exists) {
          const { error } = await supabase.storage.from('desafios-unidades').upload(path, buffer, {
            contentType: mime,
            metadata: { challengeId },
          });
          if (error) {
            this.logger.error('Supabase storage upload error', error as any);
            throw new InternalServerErrorException(error.message || 'Upload error');
          }
        }
      }

      // Retorna URL pública (bucket público)
      const { data: pub } = supabase.storage.from('desafios-unidades').getPublicUrl(path);
      return pub?.publicUrl ?? null;
    } catch (e) {
      // fallback: try upload directly
      const { error } = await supabase.storage.from('desafios-unidades').upload(path, buffer, {
        contentType: mime,
        metadata: { challengeId },
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Supabase storage upload error (fallback):', error);
        throw new InternalServerErrorException(error.message || 'Upload error');
      }
      const { data: pub } = supabase.storage.from('desafios-unidades').getPublicUrl(path);
      return pub?.publicUrl ?? null;
    }
  }

  private async transcodeVideo(buffer: Buffer, filename: string) {
    const tmpDir = os.tmpdir();
    const inName = `in-${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;
    const outName = `out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
    const inPath = path.join(tmpDir, inName);
    const outPath = path.join(tmpDir, outName);

    try {
      await fsPromises.writeFile(inPath, buffer);

      // ffmpeg args: reduce quality using crf and audio bitrate, scale max width to 1280
      const args = [
        '-y',
        '-i',
        inPath,
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '28',
        '-c:a',
        'aac',
        '-b:a',
        '96k',
        '-vf',
        "scale='min(1280,iw)':-2",
        outPath,
      ];

      const res = spawnSync('ffmpeg', args, { timeout: 120000 });
      if (res.error || res.status !== 0) {
        this.logger.warn('ffmpeg failed', res.error || res.stderr?.toString());
        // throw to let caller fallback
        throw res.error || new Error('ffmpeg failed to transcode');
      }

      const outBuf = await fsPromises.readFile(outPath);
      return { buffer: outBuf, filename: path.basename(outPath), mime: 'video/mp4' };
    } finally {
      // cleanup
      try {
        await fsPromises.unlink(inPath).catch(() => null);
        await fsPromises.unlink(outPath).catch(() => null);
      } catch (e) {
        // ignore cleanup errors
      }
    }
  }
}
