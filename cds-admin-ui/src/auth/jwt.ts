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

export function userFromIdToken(idToken: string): UserInfo {
  const claims = parseJwtPayload<Record<string, unknown>>(idToken);
  return {
    subject: typeof claims.sub === 'string' ? claims.sub : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    preferredUsername: typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined
  };
}

export function validateIdTokenNonce(idToken: string, expectedNonce: string): void {
  const claims = parseJwtPayload<{ nonce?: string }>(idToken);
  if (!claims.nonce || claims.nonce !== expectedNonce) {
    throw new Error('ID token nonce validation failed.');
  }
}
