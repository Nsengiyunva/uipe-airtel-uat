import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AirtelCallbackBody, PaymentStatus } from './airtel-callback.types.js';

@Injectable()
export class AirtelCallbackService {
  private readonly logger = new Logger(AirtelCallbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  static mapStatus(code: string): PaymentStatus {
    switch (code) {
      case 'TS':
        return 'SUCCESS';
      case 'TF': // failed
      case 'TE': // expired
        return 'FAILED';
      default: // TA ambiguous, TIP in progress, unknown
        return 'PENDING';
    }
  }

  async process(body: AirtelCallbackBody, sourceIp: string): Promise<void> {
    const { id, status_code, airtel_money_id, message } = body.transaction;
    const status = AirtelCallbackService.mapStatus(status_code);

    // One transaction: store the raw callback (always) and move the payment out of
    // PENDING (only if it is still PENDING). The `status: 'PENDING'` filter is the
    // idempotency guard: retries and duplicates update nothing, even under concurrency.
    const [, update] = await this.prisma.$transaction([
      this.prisma.airtelCallback.create({
        data: {
          sourceIp,
          reference: id,
          statusCode: status_code,
          raw: body as unknown as Prisma.InputJsonObject,
        },
      }),
      this.prisma.payment.updateMany({
        where: { reference: id, status: 'PENDING' },
        data: { status, airtelMoneyId: airtel_money_id, providerMessage: message },
      }),
    ]);

    if (update.count === 0) {
      const existing = await this.prisma.payment.findUnique({ where: { reference: id } });
      this.logger.warn(
        existing
          ? `Callback for ${id} ignored: payment already ${existing.status}`
          : `Callback for unknown reference ${id} stored but matched no payment`,
      );
      return;
    }

    // TODO: confirm with Airtel's transaction-enquiry API before trusting the body.
    // TODO: on SUCCESS -> mark membership paid, issue receipt, etc.
    this.logger.log(`Airtel ${id} -> ${status} (${airtel_money_id ?? 'n/a'})`);
  }
}
