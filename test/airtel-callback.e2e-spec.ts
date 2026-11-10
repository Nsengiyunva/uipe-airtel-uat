import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createFakePrisma } from './fake-prisma.js';
import { AirtelModule } from '../src/airtel/airtel.module.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/app.setup.js';

const URL = '/api/payments/airtel/callback';

describe('Airtel callback (e2e)', () => {
  let app: NestExpressApplication;
  const fake = createFakePrisma();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [PrismaModule, AirtelModule] })
      .overrideProvider(PrismaService)
      .useValue(fake)
      .compile();
    app = mod.createNestApplication<NestExpressApplication>({ bodyParser: false });
    setupApp(app);
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    fake.callbacks.length = 0;
  });

  it('stores a normal Airtel JSON callback and extracts the key fields', async () => {
    const payload = { transaction: { id: 'REF-1', status_code: 'TS', airtel_money_id: 'MP1', message: 'ok' } };
    const res = await request(app.getHttpServer()).post(URL).send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'received' });
    expect(fake.callbacks).toHaveLength(1);
    expect(fake.callbacks[0]).toMatchObject({
      reference: 'REF-1',
      statusCode: 'TS',
      airtelMoneyId: 'MP1',
      body: payload,
    });
    expect(JSON.parse(fake.callbacks[0].rawBody)).toEqual(payload);
  });

  it('stores a JSON payload with an unexpected shape (no 400)', async () => {
    const res = await request(app.getHttpServer()).post(URL).send({ foo: 'bar', n: 1 });
    expect(res.status).toBe(200);
    expect(fake.callbacks[0]).toMatchObject({ reference: undefined, body: { foo: 'bar', n: 1 } });
  });

  it('stores malformed JSON as raw text', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .set('Content-Type', 'application/json')
      .send('{"transaction": {"id": "X"');
    expect(res.status).toBe(200);
    expect(fake.callbacks[0].rawBody).toBe('{"transaction": {"id": "X"');
    expect(fake.callbacks[0].body).toBeUndefined();
  });

  it('stores non-JSON bodies (plain text, form data)', async () => {
    await request(app.getHttpServer()).post(URL).set('Content-Type', 'text/plain').send('hello');
    await request(app.getHttpServer()).post(URL).type('form').send({ a: '1' });
    expect(fake.callbacks.map((c) => c.rawBody)).toEqual(['hello', 'a=1']);
  });

  it('stores an empty body', async () => {
    const res = await request(app.getHttpServer()).post(URL);
    expect(res.status).toBe(200);
    expect(fake.callbacks[0].rawBody).toBe('');
  });

  it('does not store authorization/cookie headers', async () => {
    await request(app.getHttpServer())
      .post(URL)
      .set('Authorization', 'Bearer secret')
      .set('Cookie', 'a=b')
      .set('X-Signature', 'abc')
      .send({ transaction: { id: 'R', status_code: 'TS' } });
    const h = fake.callbacks[0].headers;
    expect(h.authorization).toBeUndefined();
    expect(h.cookie).toBeUndefined();
    expect(h['x-signature']).toBe('abc');
  });

  it('returns 500 (not a silent 200) when the database write fails', async () => {
    fake.failNext = true;
    const res = await request(app.getHttpServer()).post(URL).send({ transaction: { id: 'R' } });
    expect(res.status).toBe(500);
  });

  it('other routes still parse JSON normally', async () => {
    const res = await request(app.getHttpServer()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
