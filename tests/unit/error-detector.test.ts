import { describe, it, expect, vi } from 'vitest';
import { setupErrorListeners } from '../../src/execution/error-detector.js';

type Handler = (...args: any[]) => any;

function createMockPage(currentUrl = 'https://example.com/current') {
  const handlers: Record<string, Handler[]> = {};

  return {
    url: vi.fn(() => currentUrl),
    locator: vi.fn(() => ({
      first: () => ({
        elementHandle: vi.fn().mockResolvedValue(null),
      }),
    })),
    on: vi.fn((event: string, handler: Handler) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: Handler) => {
      handlers[event] = (handlers[event] || []).filter(h => h !== handler);
    }),
    handlers,
  } as any;
}

function createMockResponse(url: string, status: number, resourceType = 'document', method = 'GET') {
  return {
    status: () => status,
    url: () => url,
    request: () => ({
      resourceType: () => resourceType,
      method: () => method,
    }),
  };
}

function createMockConsoleMessage(message: string, locationUrl = '') {
  return {
    type: () => 'error',
    text: () => message,
    location: () => ({ url: locationUrl }),
  };
}

describe('setupErrorListeners', () => {
  it('ignores Next.js image optimizer network failures', async () => {
    const page = createMockPage();
    const { collector } = setupErrorListeners(page);
    const responseHandler = page.handlers.response[0];

    await responseHandler(
      createMockResponse(
        'https://example.com/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fhero.png&w=640&q=75',
        400,
        'image'
      )
    );

    expect(collector.networkFailures).toHaveLength(0);
    expect(collector.brokenImages).toHaveLength(0);
  });

  it('captures non-ignored network failures', async () => {
    const page = createMockPage();
    const { collector } = setupErrorListeners(page);
    const responseHandler = page.handlers.response[0];

    await responseHandler(createMockResponse('https://example.com/api/profile', 500, 'fetch', 'POST'));

    expect(collector.networkFailures).toHaveLength(1);
    expect(collector.networkFailures[0]).toMatchObject({
      url: 'https://example.com/api/profile',
      status: 500,
      method: 'POST',
      resourceType: 'fetch',
    });
  });

  it('ignores console errors originating from Next.js image optimizer URLs', () => {
    const page = createMockPage();
    const { collector } = setupErrorListeners(page);
    const consoleHandler = page.handlers.console[0];

    consoleHandler(
      createMockConsoleMessage(
        'Failed to load resource: the server responded with a status of 400 ()',
        'https://example.com/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fhero.png&w=640&q=75'
      )
    );

    expect(collector.consoleErrors).toHaveLength(0);
  });

  it('captures standard console errors', () => {
    const page = createMockPage();
    const { collector } = setupErrorListeners(page);
    const consoleHandler = page.handlers.console[0];

    consoleHandler(
      createMockConsoleMessage(
        'TypeError: Cannot read properties of undefined',
        'https://example.com/_next/static/chunks/main.js'
      )
    );

    expect(collector.consoleErrors).toHaveLength(1);
    expect(collector.consoleErrors[0].message).toContain('TypeError');
  });
});
