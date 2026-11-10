import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.set('trust proxy', 'loopback'); // real client IP behind nginx (X-Forwarded-For)
  app.setGlobalPrefix('api', { exclude: [''] });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
