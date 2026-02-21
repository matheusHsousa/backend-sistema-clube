import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontend = process.env.FRONTEND_URL || 'http://localhost:4200';
  const port = Number(process.env.PORT || 3000);

  // Habilita CORS configurável por env
  app.enableCors({
    origin: frontend,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}, CORS origin: ${frontend}`);
}
bootstrap();
