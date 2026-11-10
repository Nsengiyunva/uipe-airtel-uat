import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Tests use a fake Prisma; point the generated client at a stub so no `prisma generate` is needed.
    alias: [
      { find: /^.*\/generated\/prisma\/client\.js$/, replacement: new URL('./test/stub-prisma-client.ts', import.meta.url).pathname },
    ],
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
