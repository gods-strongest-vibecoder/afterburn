import { describe, it, expect, vi } from 'vitest';
import { validateLinks, createLinkValidationState } from '../../src/discovery/link-validator.js';
import type { LinkInfo } from '../../src/types/discovery.js';

describe('link-validator SSRF protections', () => {
  it('flags redirects to private IP destinations as broken links', async () => {
    const links: LinkInfo[] = [
      {
        href: 'https://8.8.8.8/public',
        text: 'Public',
        isInternal: true,
      },
    ];

    const mockPage = {
      url: () => 'https://8.8.8.8/root',
      request: {
        get: vi.fn(async () => ({
          status: () => 200,
          statusText: () => 'OK',
          url: () => 'http://127.0.0.1/admin',
        })),
      },
    } as any;

    const broken = await validateLinks(links, mockPage, createLinkValidationState());

    expect(broken).toHaveLength(1);
    expect(broken[0].statusCode).toBe(0);
    expect(broken[0].statusText).toContain('SSRF protection');
  });
});
