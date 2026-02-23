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

  const frontend = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/+$/, '');
  const port = Number(process.env.PORT || 3000);

  // Normaliza e loga a origem do frontend para evitar problemas com barras finais
  const normalizedFrontend = frontend.replace(/\/+$/, '');
  // Habilita CORS configurável por env
  console.log(`FRONTEND_URL (normalized)= ${normalizedFrontend}`);
  app.enableCors({
    origin: normalizedFrontend,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}, CORS origin: ${normalizedFrontend}`);
}
bootstrap();
