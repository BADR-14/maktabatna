import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.ts';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Sync batches carry a few hundred rows.
  app.useBodyParser('json', { limit: '10mb' });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 so phones on the Tailscale network can reach it.
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
