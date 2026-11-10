import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Call this when you initiate a payment with Airtel. `reference` is the value you
   * send as transaction.id; the callback is matched back to this row by it.
   */
  createPending(input: { reference: string; amount?: string | number; msisdn?: string }) {
    return this.prisma.payment.create({
      data: { reference: input.reference, amount: input.amount, msisdn: input.msisdn },
    });
  }

  findByReference(reference: string) {
    return this.prisma.payment.findUnique({ where: { reference } });
  }
}
