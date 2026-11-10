import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakePrisma } from './fake-prisma.js';

// Tests use a fake Prisma (the real client is generated at build time and needs a database).

import { AirtelModule } from '../src/airtel/airtel.module.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Airtel callback (e2e)', () => {
  let app: INestApplication;
  const fake = createFakePrisma([
    { reference: 'REF-OK' },
    { reference: 'REF-FAIL' },
    { reference: 'REF-PENDING' },
  ]);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [PrismaModule, AirtelModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fake)
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(() => app.close());

  const post = (id: string, code: string, extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/payments/airtel/callback')
      .send({ transaction: { id, status_code: code, airtel_money_id: 'MP1', message: 'ok', ...extra } });

  it('stores the raw callback and marks the payment SUCCESS on TS', async () => {
    const res = await post('REF-OK', 'TS');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'received' });
    expect(fake.payments.get('REF-OK')).toMatchObject({ status: 'SUCCESS', airtelMoneyId: 'MP1' });
    expect(fake.callbacks).toHaveLength(1);
    expect(fake.callbacks[0]).toMatchObject({ reference: 'REF-OK', statusCode: 'TS' });
  });

  it('is idempotent: a duplicate/late callback is stored but does not change a finalised payment', async () => {
    const res = await post('REF-OK', 'TF');
    expect(res.status).toBe(200);
    expect(fake.payments.get('REF-OK')!.status).toBe('SUCCESS');
    expect(fake.callbacks).toHaveLength(2);
  });

  it('maps TF to FAILED', async () => {
    await post('REF-FAIL', 'TF');
    expect(fake.payments.get('REF-FAIL')!.status).toBe('FAILED');
  });

  it('keeps the payment PENDING on TIP, then finalises on a later TS', async () => {
    await post('REF-PENDING', 'TIP');
    expect(fake.payments.get('REF-PENDING')!.status).toBe('PENDING');
    await post('REF-PENDING', 'TS');
    expect(fake.payments.get('REF-PENDING')!.status).toBe('SUCCESS');
  });

  it('stores callbacks for unknown references without failing', async () => {
    const before = fake.callbacks.length;
    const res = await post('REF-UNKNOWN', 'TS');
    expect(res.status).toBe(200);
    expect(fake.callbacks).toHaveLength(before + 1);
  });

  it('rejects an invalid payload with 400', async () => {
    const res = await request(app.getHttpServer()).post('/api/payments/airtel/callback').send({ foo: 1 });
    expect(res.status).toBe(400);
  });
});
