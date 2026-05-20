import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/config', () => ({
  getConfig: () => ({
    authMode: 'keycloak-dpop',
    keycloakIssuer: 'https://issuer.example.com',
    keycloakClientId: 'client-id',
    keycloakScope: 'openid profile email',
    cdsApiBaseUrl: '',
    redirectPath: '/callback',
    postLogoutPath: '/'
  }),
  buildAbsoluteSameOriginUrl: (p: string) => `${window.location.origin}${p}`
}));

import { handleCallback } from '../auth/oidc';

describe('OIDC callback state validation', () => {
  afterEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('rejects missing state', async () => {
    window.history.replaceState({}, '', '/callback?code=abc');
    await expect(handleCallback()).rejects.toThrow('OAuth callback is missing required code or state.');
  });

  it('rejects mismatched state', async () => {
    sessionStorage.setItem(
      'cds_admin_auth_tx',
      JSON.stringify({ state: 'expected', nonce: 'n', codeVerifier: 'v', redirectPath: '/callback' })
    );
    sessionStorage.setItem(
      'cds_admin_dpop_jwk',
      JSON.stringify({ privateJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' }, publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' } })
    );
    window.history.replaceState({}, '', '/callback?code=abc&state=wrong');
    await expect(handleCallback()).rejects.toThrow('OAuth state validation failed.');
  });
});
