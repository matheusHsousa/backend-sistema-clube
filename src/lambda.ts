import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';

// Global error handlers to surface crashes in serverless logs
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('unhandledRejection', reason);
});

let cachedHandler: any = null;

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

  const server = express();

  // Apply JSON body parser manually and avoid Nest registering parser middleware
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Create Nest app with bodyParser disabled to skip registerParserMiddleware
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bodyParser: false,
  });

  // Normaliza e loga a origem do frontend para evitar problemas com barras finais
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/+$/, '');
  console.log(`FRONTEND_URL (normalized)= ${frontend}`);
  app.enableCors({
    origin: frontend,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  try {
    await app.init();
  } catch (err) {
    console.error('bootstrap init error', err);
    throw err;
  }
  return serverless(server);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(req, res);
}
