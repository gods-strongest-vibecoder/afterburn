import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAfterburnVersion } from '../../src/version.js';

describe('version', () => {
  it('matches package.json version', () => {
    const testsDir = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(testsDir, '../..');
    const packageJsonPath = join(repoRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string };

    expect(getAfterburnVersion()).toBe(packageJson.version);
  });
});
