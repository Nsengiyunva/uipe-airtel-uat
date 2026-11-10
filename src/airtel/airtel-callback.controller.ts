import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AirtelCallbackService } from './airtel-callback.service.js';
import type { AirtelCallbackBody } from './airtel-callback.types.js';

function isValidBody(b: unknown): b is AirtelCallbackBody {
  const t = (b as AirtelCallbackBody | undefined)?.transaction;
  return !!t && typeof t.id === 'string' && t.id !== '' && typeof t.status_code === 'string';
}

@Controller('payments/airtel')
export class AirtelCallbackController {
  private readonly logger = new Logger(AirtelCallbackController.name);

  constructor(private readonly service: AirtelCallbackService) {}

  @Post('callback')
  @HttpCode(200)
  async handle(@Body() body: unknown, @Req() req: Request) {
    const ip = (req.ip ?? '').replace('::ffff:', '');

    // Optional IP allowlist: AIRTEL_ALLOWED_IPS="1.2.3.4,5.6.7.8"
    const allowed = (process.env.AIRTEL_ALLOWED_IPS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length && !allowed.includes(ip)) {
      this.logger.warn(`Callback rejected from ${ip}`);
      throw new ForbiddenException();
    }

    if (!isValidBody(body)) throw new BadRequestException('Invalid callback payload');

    this.logger.log(`Airtel callback from ${ip}: ${JSON.stringify(body)}`);

    // If storing fails we let the error surface as a 500 (instead of a silent 200) so the
    // event is not lost quietly; the full body is in the log line above as a fallback.
    await this.service.process(body, ip);
    return { status: 'received' };
  }
}
