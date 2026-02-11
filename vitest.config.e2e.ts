import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    timeout: 180000,
    environment: 'node',
    sequence: {
      concurrent: false,
    },
  },
});
