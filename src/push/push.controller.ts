import { Controller, Post, Body, Get } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private svc: PushService) {}

  @Post('subscribe')
  async subscribe(@Body() body: any) {
    const { subscription, userId, role } = body || {};
    if (!subscription || !subscription.endpoint) return { success: false, error: 'invalid subscription' };
    await this.svc.saveSubscription(userId || null, role || null, subscription);
    return { success: true };
  }

  @Get('publicKey')
  publicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || null };
  }
}
