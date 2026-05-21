import { afterEach, describe, expect, it, vi } from 'vitest';
import { base64urlEncode } from '../crypto/base64url';
import { validateIdToken } from '../auth/jwt';

const jwksUri = 'https://issuer.example.com/jwks';
const issuer = 'https://issuer.example.com';
const clientId = 'cds-admin-ui';

function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = base64urlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64urlEncode(JSON.stringify(payload));
  return `${header}.${body}.`;
}

async function generateSigningKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
    kid?: string;
    use?: string;
    alg?: string;
  };
  publicJwk.kid = 'test-key-1';
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';
  return { keyPair, publicJwk };
}

async function signJwt(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', typ: 'JWT', kid: 'test-key-1' }
): Promise<string> {
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64urlEncode(signature)}`;
}

describe('ID token validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects alg:none unsigned token', async () => {
    const token = makeUnsignedJwt({
      iss: issuer,
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'n'
    });
    await expect(validateIdToken(token, { issuer, clientId, nonce: 'n', jwksUri })).rejects.toThrow(
      'ID token uses an unsupported signing algorithm.'
    );
  });

  it('rejects issuer mismatch', async () => {
    const { keyPair, publicJwk } = await generateSigningKeyPair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }));
    const token = await signJwt(keyPair.privateKey, {
      iss: 'https://other.example.com',
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'n'
    });
    await expect(validateIdToken(token, { issuer, clientId, nonce: 'n', jwksUri })).rejects.toThrow('ID token issuer validation failed.');
  });

  it('rejects audience mismatch', async () => {
    const { keyPair, publicJwk } = await generateSigningKeyPair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }));
    const token = await signJwt(keyPair.privateKey, {
      iss: issuer,
      aud: 'another-client',
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'n'
    });
    await expect(validateIdToken(token, { issuer, clientId, nonce: 'n', jwksUri })).rejects.toThrow('ID token audience validation failed.');
  });

  it('rejects expired token', async () => {
    const { keyPair, publicJwk } = await generateSigningKeyPair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }));
    const token = await signJwt(keyPair.privateKey, {
      iss: issuer,
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) - 120,
      nonce: 'n'
    });
    await expect(validateIdToken(token, { issuer, clientId, nonce: 'n', jwksUri })).rejects.toThrow('ID token has expired.');
  });

  it('rejects nonce mismatch', async () => {
    const { keyPair, publicJwk } = await generateSigningKeyPair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }));
    const token = await signJwt(keyPair.privateKey, {
      iss: issuer,
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'actual'
    });
    await expect(validateIdToken(token, { issuer, clientId, nonce: 'expected', jwksUri })).rejects.toThrow('ID token nonce validation failed.');
  });

  it('rejects bad signature', async () => {
    const { keyPair, publicJwk } = await generateSigningKeyPair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }));
    const token = await signJwt(keyPair.privateKey, {
      iss: issuer,
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'n'
    });
    const tampered = token.replace(/\.[^.]*$/, '.AAAA');
    await expect(validateIdToken(tampered, { issuer, clientId, nonce: 'n', jwksUri })).rejects.toThrow(
      'ID token signature verification failed.'
    );
  });

  it('accepts valid RS256 token signed by JWKS key', async () => {
    const { keyPair, publicJwk } = await generateSigningKeyPair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }));
    const token = await signJwt(keyPair.privateKey, {
      iss: issuer,
      aud: [clientId, 'account'],
      sub: 'user-123',
      preferred_username: 'admin',
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'n'
    });
    const claims = await validateIdToken(token, { issuer, clientId, nonce: 'n', jwksUri });
    expect(claims.sub).toBe('user-123');
  });
});
