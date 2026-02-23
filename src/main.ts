import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Global error handlers to surface crashes in serverless logs
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('unhandledRejection', reason);
});

async function bootstrap() {
  // log express version if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ev = require('express/package.json').version;
    // eslint-disable-next-line no-console
    console.log('express version=', ev);
  } catch (e) {
    // ignore
  }

  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT || 3000);

  // Ler variáveis de frontend: permite FRONTEND_URL_PROD e FRONTEND_URL_DEV
  const prodUrl = (process.env.FRONTEND_URL_PROD || '').replace(/\/+$/, '');
  const devUrl = (process.env.FRONTEND_URL_DEV || process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/+$/, '');

  // Constrói a lista de origens permitidas (pode conter 1 ou 2 entradas)
  const allowedOrigins = Array.from(new Set([prodUrl, devUrl].filter(Boolean)));

  console.log(`Allowed CORS origins= ${allowedOrigins.join(',')}`);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}, CORS origins: ${allowedOrigins.join(',')}`);
}
bootstrap();
