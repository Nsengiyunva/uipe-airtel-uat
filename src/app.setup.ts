import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, raw, urlencoded } from 'express';

/**
 * Shared app configuration (used by main.ts and the tests).
 * Create the app with `{ bodyParser: false }`: the callback route gets a raw body parser so
 * we can store exactly what Airtel sends, and every other route gets the normal parsers.
 */
export function setupApp(app: NestExpressApplication) {
  app.set('trust proxy', 'loopback'); // real client IP behind nginx (X-Forwarded-For)
  app.setGlobalPrefix('api', { exclude: [''] });
  app.use('/api/payments/airtel/callback', raw({ type: () => true, limit: '256kb' }));
  app.use(json());
  app.use(urlencoded({ extended: true }));
}
