import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersion: string | null = null;

export function getAfterburnVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));

    // Support multiple runtimes:
    // - CLI: dist/version.js -> ../package.json
    // - GitHub Action bundle: action/dist/index.js -> ../../package.json
    const candidatePaths = [
      resolve(currentDir, '../package.json'),
      resolve(currentDir, '../../package.json'),
      resolve(currentDir, '../../../package.json'),
    ];

    for (const candidatePath of candidatePaths) {
      if (!existsSync(candidatePath)) {
        continue;
      }

      const packageJsonRaw = readFileSync(candidatePath, 'utf-8');
      const packageJson = JSON.parse(packageJsonRaw) as { version?: unknown };
      if (typeof packageJson.version === 'string') {
        cachedVersion = packageJson.version;
        return cachedVersion;
      }
    }

    cachedVersion = '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }

  return cachedVersion;
}
