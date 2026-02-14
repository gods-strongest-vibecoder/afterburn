import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ArtifactStorage } from '../../src/artifacts/artifact-storage.js';

describe('ArtifactStorage hardening', () => {
  let tempRoot: string;
  let artifactsDir: string;
  let storage: ArtifactStorage;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'afterburn-artifacts-'));
    artifactsDir = path.join(tempRoot, 'artifacts');
    storage = new ArtifactStorage(artifactsDir);
  });

  afterEach(async () => {
    await fs.remove(tempRoot);
  });

  it('saves and loads artifact with safe session id', async () => {
    const artifact = {
      version: '1.0',
      stage: 'execution',
      timestamp: new Date().toISOString(),
      sessionId: 'safe-session',
      targetUrl: 'https://example.com',
    };

    await storage.save(artifact);
    const loaded = await storage.load<typeof artifact>('execution', 'safe-session');

    expect(loaded.sessionId).toBe('safe-session');
    expect(await storage.exists('execution', 'safe-session')).toBe(true);
  });

  it('does not allow traversal-style session ids to read files outside artifact dir', async () => {
    const outsidePath = path.join(tempRoot, 'outside.json');
    await fs.writeJson(outsidePath, { leaked: true });

    await expect(
      storage.load('execution', '../../../outside')
    ).rejects.toThrow('Artifact not found');

    await expect(
      storage.exists('execution', '../../../outside')
    ).resolves.toBe(false);
  });
});
