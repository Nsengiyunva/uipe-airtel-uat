import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RawCallback } from './airtel-callback.types.js';

const str = (v: unknown): string | undefined =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;

@Injectable()
export class AirtelCallbackService {
  private readonly logger = new Logger(AirtelCallbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Store a callback exactly as received. Never rejects based on its content. */
  async record(cb: RawCallback): Promise<void> {
    let body: unknown;
    try {
      body = cb.rawBody ? JSON.parse(cb.rawBody) : undefined;
    } catch {
      body = undefined; // not JSON: rawBody still holds it
    }

    const tx = (body as { transaction?: Record<string, unknown> } | undefined)?.transaction;
    const reference = str(tx?.id);
    const statusCode = str(tx?.status_code);
    const airtelMoneyId = str(tx?.airtel_money_id);

    await this.prisma.airtelCallback.create({
      data: {
        sourceIp: cb.sourceIp,
        contentType: cb.contentType,
        headers: cb.headers as Prisma.InputJsonObject,
        rawBody: cb.rawBody,
        body: body === undefined || body === null ? undefined : (body as Prisma.InputJsonValue),
        reference,
        statusCode,
        airtelMoneyId,
      },
    });

    this.logger.log(
      `Airtel callback stored: ref=${reference ?? 'n/a'} status=${statusCode ?? 'n/a'} ip=${cb.sourceIp}`,
    );
  }
}
