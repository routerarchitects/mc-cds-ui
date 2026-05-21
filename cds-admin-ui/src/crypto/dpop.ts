import { base64urlEncode, randomBase64url, sha256Base64url } from './base64url';

export interface ExportedDpopKeyPair {
  privateJwk: JsonWebKey;
  publicJwk: JsonWebKey;
}

export interface RuntimeDpopKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey;
  jkt: string;
}

export interface DpopProofOptions {
  method: string;
  url: string;
  accessToken?: string;
  nonce?: string;
}

const keyAlgorithm: EcKeyGenParams = { name: 'ECDSA', namedCurve: 'P-256' };
const signingAlgorithm: EcdsaParams = { name: 'ECDSA', hash: 'SHA-256' };

export function ensureWebCrypto(): void {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error('This browser does not support required Web Crypto APIs.');
  }
}

export async function generateExportableDpopKeyPair(): Promise<ExportedDpopKeyPair> {
  ensureWebCrypto();
  const pair = await crypto.subtle.generateKey(keyAlgorithm, true, ['sign', 'verify']);
  return {
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey)
  };
}

export async function importRuntimeDpopKeyPair(exported: ExportedDpopKeyPair): Promise<RuntimeDpopKeyPair> {
  ensureWebCrypto();
  const privateKey = await crypto.subtle.importKey('jwk', exported.privateJwk, keyAlgorithm, false, ['sign']);
  const publicKey = await crypto.subtle.importKey('jwk', exported.publicJwk, keyAlgorithm, true, ['verify']);
  const publicJwk = await crypto.subtle.exportKey('jwk', publicKey);
  return { privateKey, publicKey, publicJwk, jkt: await jwkThumbprint(publicJwk) };
}

export async function jwkThumbprint(publicJwk: JsonWebKey): Promise<string> {
  if (publicJwk.kty !== 'EC' || publicJwk.crv !== 'P-256' || !publicJwk.x || !publicJwk.y) {
    throw new Error('Invalid P-256 public JWK for DPoP thumbprint.');
  }
  // RFC7638 canonical member order for this JWK type.
  const canonical = JSON.stringify({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x, y: publicJwk.y });
  return sha256Base64url(canonical);
}

export function normalizeHtu(url: string): string {
  const parsed = new URL(url, window.location.origin);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function derToJose(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  // Defensive DER parser for environments that return ASN.1 DER ECDSA signatures.
  if (signature[0] !== 0x30) {
    throw new Error('Unsupported ECDSA signature format.');
  }
  let offset = 2;
  if (signature[1] & 0x80) {
    offset = 2 + (signature[1] & 0x7f);
  }
  if (signature[offset] !== 0x02) throw new Error('Invalid DER ECDSA signature.');
  const rLen = signature[offset + 1];
  const r = signature.slice(offset + 2, offset + 2 + rLen);
  offset += 2 + rLen;
  if (signature[offset] !== 0x02) throw new Error('Invalid DER ECDSA signature.');
  const sLen = signature[offset + 1];
  const s = signature.slice(offset + 2, offset + 2 + sLen);

  const out = new Uint8Array(64);
  out.set(r.slice(Math.max(0, r.length - 32)), 32 - Math.min(32, r.length));
  out.set(s.slice(Math.max(0, s.length - 32)), 64 - Math.min(32, s.length));
  return out;
}

export async function createDpopProof(keyPair: RuntimeDpopKeyPair, options: DpopProofOptions): Promise<string> {
  const header = {
    typ: 'dpop+jwt',
    alg: 'ES256',
    jwk: {
      kty: keyPair.publicJwk.kty,
      crv: keyPair.publicJwk.crv,
      x: keyPair.publicJwk.x,
      y: keyPair.publicJwk.y
    }
  };

  const payload: Record<string, string | number> = {
    jti: randomBase64url(16),
    htm: options.method.toUpperCase(),
    htu: normalizeHtu(options.url),
    iat: Math.floor(Date.now() / 1000)
  };

  if (options.accessToken) {
    payload.ath = await sha256Base64url(options.accessToken);
  }
  if (options.nonce) {
    payload.nonce = options.nonce;
  }

  const signingInput = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(payload))}`;
  const signature = new Uint8Array(await crypto.subtle.sign(signingAlgorithm, keyPair.privateKey, new TextEncoder().encode(signingInput)));
  return `${signingInput}.${base64urlEncode(derToJose(signature))}`;
}
