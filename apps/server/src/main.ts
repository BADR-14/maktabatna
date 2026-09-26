import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 so phones on the Tailscale network can reach it.
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
