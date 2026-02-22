import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';

let cachedHandler: any = null;

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  const frontend = process.env.FRONTEND_URL || 'http://localhost:4200';
  app.enableCors({
    origin: frontend,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.init();
  return serverless(server);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(req, res);
}
