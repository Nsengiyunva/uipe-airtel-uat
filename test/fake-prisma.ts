/** In-memory stand-in for PrismaService, just enough for the Airtel callback tests. */
export function createFakePrisma() {
  const callbacks: Record<string, any>[] = [];
  const fake = {
    callbacks,
    failNext: false,
    airtelCallback: {
      create: ({ data }: any) => {
        if (fake.failNext) {
          fake.failNext = false;
          return Promise.reject(new Error('db down'));
        }
        callbacks.push(data);
        return Promise.resolve(data);
      },
    },
  };
  return fake;
}
