import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

declare global {
  // allow global caching across lambda invocations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __prisma: any;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // pass options to super if needed in future
    super();
    // reuse global instance in serverless environments to avoid creating many connections
    if (global.__prisma) {
      // return existing instance to reuse connections
      // eslint-disable-next-line no-constructor-return
      return global.__prisma as PrismaService;
    }
    global.__prisma = this;
  }

  async onModuleInit() {
    // If explicitly disabled or missing DATABASE_URL, skip connecting
    if (process.env.DISABLE_PRISMA === 'true' || !process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.log('Prisma disabled by DISABLE_PRISMA or missing DATABASE_URL — skipping connection');
      return;
    }

    // If already connected (reused instance), skip extra connect
    try {
      // $connect is idempotent if already connected
      await this.$connect();
      // eslint-disable-next-line no-console
      console.log('Prisma connected');
      return;
    } catch (initialErr) {
      // try a few times with backoff
      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await delay(1000 * attempt);
          await this.$connect();
          // eslint-disable-next-line no-console
          console.log('Prisma connected after retry', attempt);
          return;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Prisma connect attempt ${attempt} failed:`, err?.message || err);
          if (attempt === maxAttempts) throw err;
        }
      }
    }
  }
}
