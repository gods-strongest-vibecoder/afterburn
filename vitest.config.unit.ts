import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    timeout: 10000,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/core/**/*.ts',
        'src/discovery/**/*.ts',
        'src/execution/**/*.ts',
        'src/reports/**/*.ts',
        'src/cli/**/*.ts',
      ],
      thresholds: {
        lines: 35,
        functions: 40,
        branches: 35,
        statements: 35,
      },
    },
  },
});
