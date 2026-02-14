import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';

const actionYmlPath = path.join(process.cwd(), 'action', 'action.yml');
const bundledEntryPath = path.join(process.cwd(), 'action', 'dist', 'index.js');

describe('GitHub Action contract', () => {
  it('uses bundled action entrypoint with node20 runtime', async () => {
    const actionYml = await fs.readFile(actionYmlPath, 'utf8');

    expect(actionYml).toContain("using: 'node20'");
    expect(actionYml).toContain("main: 'dist/index.js'");
  });

  it('preserves required fail-on input contract', async () => {
    const actionYml = await fs.readFile(actionYmlPath, 'utf8');

    expect(actionYml).toContain('fail-on:');
    expect(actionYml).toContain("default: 'high'");
    expect(actionYml).toContain('"critical"/"high" (default), "medium", "low", "never"');
  });

  it('ships a bundled action artifact', async () => {
    const exists = await fs.pathExists(bundledEntryPath);
    expect(exists).toBe(true);
  });
});
