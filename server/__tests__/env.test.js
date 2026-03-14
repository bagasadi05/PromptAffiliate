import { afterEach, describe, expect, it, vi } from 'vitest';

describe('parseAllowedOrigins', () => {
  afterEach(() => {
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    vi.resetModules();
  });

  it('adds Vercel deployment domains to allowed origins automatically', async () => {
    process.env.VERCEL_URL = 'prompt-pribadi.vercel.app';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'prompt-pribadi-prod.vercel.app';

    const { parseAllowedOrigins } = await import('../config/env.js');
    const origins = parseAllowedOrigins('');

    expect(origins).toContain('https://prompt-pribadi.vercel.app');
    expect(origins).toContain('https://prompt-pribadi-prod.vercel.app');
  });
});
