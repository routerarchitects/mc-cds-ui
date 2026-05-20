import { randomBase64url, sha256Base64url } from './base64url';

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  // 32 random bytes = 256 bits of entropy. RFC7636 accepts 43-128 characters.
  const verifier = randomBase64url(32);
  const challenge = await sha256Base64url(verifier);
  return { verifier, challenge };
}
