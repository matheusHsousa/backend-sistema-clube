import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private supabase: SupabaseService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('VAPID configured for web-push');
    } else {
      this.logger.warn('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
    }
  }

  async saveSubscription(userId: string | null, role: string | null, subscription: any) {
    const toInsert = {
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      user_id: userId || null,
      role: role || null,
      revoked: false,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase.client.from('push_subscriptions').insert([toInsert]);
    if (error) {
      this.logger.error('Failed to save subscription', error);
      throw error;
    }
    return data;
  }

  async notifyRole(role: string, payload: any) {
    const { data: subs, error } = await this.supabase.client
      .from('push_subscriptions')
      .select('*')
      .eq('role', role)
      .eq('revoked', false);
    if (error) {
      this.logger.error('Failed to fetch subscriptions', error);
      return;
    }
    if (!Array.isArray(subs) || subs.length === 0) return;

    for (const s of subs) {
      try {
        const subscription = {
          endpoint: s.endpoint,
          keys: s.keys,
        };
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err: any) {
        this.logger.warn('Failed to send notification', err?.statusCode ?? err?.message ?? err);
        if (err && (err.statusCode === 410 || err.statusCode === 404)) {
          await this.supabase.client.from('push_subscriptions').update({ revoked: true }).eq('id', s.id);
        }
      }
    }
  }
}
