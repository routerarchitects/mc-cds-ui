import { describe, expect, it } from 'vitest';
import { createPkcePair } from '../crypto/pkce';
import { base64urlEncode } from '../crypto/base64url';
import { parseJwtPayload, validateIdTokenNonce } from '../auth/jwt';

function makeJwt(payload: Record<string, unknown>): string {
  const header = base64urlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64urlEncode(JSON.stringify(payload));
  return `${header}.${body}.`;
}

describe('auth helpers', () => {
  it('creates PKCE verifier/challenge pair', async () => {
    const pair = await createPkcePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge.length).toBeGreaterThan(0);
    expect(pair.verifier).not.toBe(pair.challenge);
  });

  it('validates nonce when ID token is present', () => {
    const token = makeJwt({ nonce: 'expected' });
    expect(() => validateIdTokenNonce(token, 'expected')).not.toThrow();
  });

  it('rejects nonce mismatch', () => {
    const token = makeJwt({ nonce: 'actual' });
    expect(() => validateIdTokenNonce(token, 'expected')).toThrow('ID token nonce validation failed.');
  });

  it('parses JWT payload', () => {
    const token = makeJwt({ sub: 'abc' });
    const payload = parseJwtPayload<{ sub: string }>(token);
    expect(payload.sub).toBe('abc');
  });
});
