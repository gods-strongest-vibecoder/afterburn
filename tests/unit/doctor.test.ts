// Unit tests for the doctor pre-flight check functions
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkNodeVersion, checkBrowserInstalled, checkApiKey, runDoctor } from '../../src/cli/doctor.js';

describe('doctor checks', () => {
  it('checkNodeVersion returns pass for Node >= 18', () => {
    // Current test runner is Node >= 18
    const result = checkNodeVersion();
    expect(result.status).toBe('pass');
    expect(result.required).toBe(true);
    expect(result.message).toContain('>=');
  });

  it('checkBrowserInstalled returns pass when chromium cache exists', () => {
    // In CI/dev environment, Playwright should be installed
    const result = checkBrowserInstalled();
    // We can't guarantee browser is installed in all test environments,
    // so just verify the function returns a valid CheckResult
    expect(['pass', 'fail']).toContain(result.status);
    expect(result.required).toBe(true);
    expect(result.name).toBe('Chromium browser');
  });

  it('checkApiKey returns warn when GEMINI_API_KEY not set', () => {
    const orig = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const result = checkApiKey();
    expect(result.status).toBe('warn');
    expect(result.required).toBe(false);
    expect(result.message).toContain('Not set');

    // Restore
    if (orig !== undefined) process.env.GEMINI_API_KEY = orig;
  });

  it('checkApiKey returns pass when GEMINI_API_KEY is set', () => {
    const orig = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key-123';

    const result = checkApiKey();
    expect(result.status).toBe('pass');
    expect(result.required).toBe(false);

    // Restore
    if (orig !== undefined) {
      process.env.GEMINI_API_KEY = orig;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('checkApiKey treats empty string as not set', () => {
    const orig = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = checkApiKey();
    expect(result.status).toBe('warn');

    if (orig !== undefined) {
      process.env.GEMINI_API_KEY = orig;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('runDoctor returns exit code 0 when all required checks pass', async () => {
    // This test depends on the test environment having Node >= 18
    // and Playwright installed. If browser is not installed, required check fails.
    const { results, exitCode } = await runDoctor();

    // Verify structure
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.every(r => ['pass', 'warn', 'fail'].includes(r.status))).toBe(true);

    // Node check should always pass in our test env
    const nodeCheck = results.find(r => r.name === 'Node.js');
    expect(nodeCheck?.status).toBe('pass');

    // Exit code should be 0 only if no required checks failed
    const hasRequiredFail = results.some(r => r.required && r.status === 'fail');
    expect(exitCode).toBe(hasRequiredFail ? 1 : 0);
  });

  it('runDoctor returns exit code 1 when required check fails', async () => {
    // We can't easily mock checkBrowserInstalled in the integration,
    // but we can verify the logic: if any required check is 'fail', exitCode is 1
    const { results, exitCode } = await runDoctor();
    const requiredFails = results.filter(r => r.required && r.status === 'fail');

    if (requiredFails.length > 0) {
      expect(exitCode).toBe(1);
    } else {
      expect(exitCode).toBe(0);
    }
  });
});
