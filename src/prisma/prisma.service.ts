import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Se a variável de ambiente estiver ativa, não tente conectar o Prisma
    if (process.env.DISABLE_PRISMA === 'true' || !process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.log('Prisma disabled by DISABLE_PRISMA or missing DATABASE_URL — skipping connection');
      return;
    }
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        // eslint-disable-next-line no-console
        console.log('Prisma connected');
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Prisma connect attempt ${attempt} failed:`, err?.message || err);
        if (attempt === maxAttempts) {
          // Final failure — rethrow so process exits and logs include the error
          throw err;
        }
        // exponential backoff
        await delay(1000 * attempt);
      }
    }
  }
}
