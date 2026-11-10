import { Controller, ForbiddenException, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AirtelCallbackService } from './airtel-callback.service.js';

const REDACTED_HEADERS = ['authorization', 'cookie', 'proxy-authorization'];

@Controller('payments/airtel')
export class AirtelCallbackController {
  private readonly logger = new Logger(AirtelCallbackController.name);

  constructor(private readonly service: AirtelCallbackService) {}

  @Post('callback')
  @HttpCode(200)
  async handle(@Req() req: Request) {
    const ip = (req.ip ?? '').replace('::ffff:', '');

    // Optional IP allowlist: AIRTEL_ALLOWED_IPS="1.2.3.4,5.6.7.8" (off when unset)
    const allowed = (process.env.AIRTEL_ALLOWED_IPS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length && !allowed.includes(ip)) {
      this.logger.warn(`Callback rejected from ${ip}`);
      throw new ForbiddenException();
    }

    // The callback route uses a raw body parser (see app.setup.ts), so we get the exact
    // bytes Airtel sent, even if they are not valid JSON. NUL bytes cannot be stored in Postgres.
    const rawBody = (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '').replaceAll('\u0000', '');

    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(([k]) => !REDACTED_HEADERS.includes(k)),
    );

    this.logger.log(`Airtel callback from ${ip}: ${rawBody}`);

    // If storing fails this surfaces as a 500 (not a silent 200); the body is in the log above.
    await this.service.record({
      sourceIp: ip,
      contentType: req.headers['content-type'],
      headers,
      rawBody,
    });
    return { status: 'received' };
  }
}
