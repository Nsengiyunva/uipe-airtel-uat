/** In-memory stand-in for PrismaService, just enough for the Airtel callback tests. */
export function createFakePrisma(seed: { reference: string; status?: string }[] = []) {
  const payments = new Map(
    seed.map((p) => [p.reference, { reference: p.reference, status: p.status ?? 'PENDING' } as Record<string, any>]),
  );
  const callbacks: Record<string, any>[] = [];

  const fake = {
    callbacks,
    payments,
    airtelCallback: {
      create: ({ data }: any) => {
        callbacks.push(data);
        return Promise.resolve(data);
      },
    },
    payment: {
      updateMany: ({ where, data }: any) => {
        const row = payments.get(where.reference);
        if (!row || row.status !== where.status) return Promise.resolve({ count: 0 });
        Object.assign(row, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
        return Promise.resolve({ count: 1 });
      },
      findUnique: ({ where }: any) => Promise.resolve(payments.get(where.reference) ?? null),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  return fake;
}
