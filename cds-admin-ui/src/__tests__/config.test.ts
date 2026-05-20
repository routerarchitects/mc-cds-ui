import { afterEach, describe, expect, it, vi } from 'vitest';

describe('config validation', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('fails closed for mock mode outside localhost/dev', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_AUTH_MODE', 'mock');
    vi.stubGlobal('window', { location: { hostname: 'example.com', origin: 'https://example.com' } });
    const { getConfig } = await import('../utils/config');
    expect(() => getConfig()).toThrow('Mock auth mode is allowed only on localhost during Vite development.');
  });

  it('requires keycloak issuer in keycloak-dpop mode', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_AUTH_MODE', 'keycloak-dpop');
    vi.stubEnv('VITE_KEYCLOAK_ISSUER', '');
    vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost:3000' } });
    const { getConfig } = await import('../utils/config');
    expect(() => getConfig()).toThrow('VITE_KEYCLOAK_ISSUER is required for keycloak-dpop mode.');
  });

  it('defaults api base to same-origin mode when env is empty', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_AUTH_MODE', 'keycloak-dpop');
    vi.stubEnv('VITE_KEYCLOAK_ISSUER', 'https://issuer');
    vi.stubEnv('VITE_CDS_API_BASE_URL', '');
    vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost:3000' } });
    const { getConfig } = await import('../utils/config');
    expect(getConfig().cdsApiBaseUrl).toBe('');
  });
});
