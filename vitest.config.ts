// Vitest configuration for Afterburn unit tests
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    timeout: 10000,
    environment: 'node',
  },
});
