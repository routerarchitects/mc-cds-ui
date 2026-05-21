import { base64urlDecode } from '../crypto/base64url';
import type { UserInfo } from './types';

export function parseJwtPayload<T extends Record<string, unknown>>(jwt: string): T {
  const parts = jwt.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT format.');
  const decoded = base64urlDecode(parts[1]);
  const json = new TextDecoder().decode(decoded);
  return JSON.parse(json) as T;
}

export function getAccessTokenExpiry(accessToken: string): number {
  const claims = parseJwtPayload<{ exp?: number }>(accessToken);
  if (!claims.exp) return Date.now() + 60_000;
  return claims.exp * 1000;
}

type IdTokenClaims = Record<string, unknown> & {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  nonce?: string;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type JsonWebKeySet = {
  keys?: Array<JsonWebKey & { kid?: string; use?: string; key_ops?: string[]; kty?: string }>;
};

export function userFromClaims(claims: Record<string, unknown>): UserInfo {
  return {
    subject: typeof claims.sub === 'string' ? claims.sub : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    preferredUsername: typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined
  };
}

export async function validateIdToken(
  idToken: string,
  options: { issuer: string; clientId: string; nonce?: string; jwksUri: string; clockSkewSeconds?: number }
): Promise<IdTokenClaims> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token format.');
  if (!parts[0] || !parts[1]) throw new Error('Invalid ID token format.');

  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0]))) as JwtHeader;
  if (!header.alg || header.alg.toUpperCase() === 'NONE' || header.alg !== 'RS256') {
    throw new Error('ID token uses an unsupported signing algorithm.');
  }
  if (!parts[2]) throw new Error('Invalid ID token format.');
  if (!header.kid) throw new Error('ID token is missing key id.');

  const claims = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1]))) as IdTokenClaims;
  const jwksResponse = await fetch(options.jwksUri, { credentials: 'omit' });
  if (!jwksResponse.ok) throw new Error('Unable to load JWKS for ID token validation.');
  const jwks = (await jwksResponse.json()) as JsonWebKeySet;
  const signingKey = (jwks.keys || []).find((key) => key.kid === header.kid);
  if (!signingKey || signingKey.kty !== 'RSA') {
    throw new Error('No matching JWKS signing key found for ID token.');
  }

  const keyUsage = Array.isArray(signingKey.key_ops) ? signingKey.key_ops : undefined;
  if ((signingKey.use && signingKey.use !== 'sig') || (keyUsage && !keyUsage.includes('verify'))) {
    throw new Error('JWKS key is not valid for signature verification.');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    signingKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signedDataRaw = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signedData = new Uint8Array(signedDataRaw);
  const signatureRaw = base64urlDecode(parts[2]);
  const signature = new Uint8Array(signatureRaw);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signedData);
  if (!verified) throw new Error('ID token signature verification failed.');

  if (claims.iss !== options.issuer) throw new Error('ID token issuer validation failed.');
  const aud = claims.aud;
  const audValid = typeof aud === 'string' ? aud === options.clientId : Array.isArray(aud) && aud.includes(options.clientId);
  if (!audValid) throw new Error('ID token audience validation failed.');
  if (typeof claims.exp !== 'number') throw new Error('ID token is missing expiration claim.');

  const skew = (options.clockSkewSeconds ?? 60) * 1000;
  const now = Date.now();
  if (claims.exp * 1000 <= now - skew) throw new Error('ID token has expired.');
  if (typeof claims.nbf === 'number' && claims.nbf * 1000 > now + skew) throw new Error('ID token is not yet valid.');
  if (options.nonce && claims.nonce !== options.nonce) throw new Error('ID token nonce validation failed.');

  return claims;
}
