import { describe, expect, it } from 'vitest';
import { base64urlDecode } from '../crypto/base64url';
import { createDpopProof, generateExportableDpopKeyPair, importRuntimeDpopKeyPair } from '../crypto/dpop';

function decodePayload(jwt: string): Record<string, unknown> {
  const payload = jwt.split('.')[1];
  const decoded = new TextDecoder().decode(base64urlDecode(payload));
  return JSON.parse(decoded) as Record<string, unknown>;
}

describe('DPoP proof generation', () => {
  it('includes required claims and strips query/hash from htu', async () => {
    const exported = await generateExportableDpopKeyPair();
    const runtime = await importRuntimeDpopKeyPair(exported);
    const jwt = await createDpopProof(runtime, {
      method: 'delete',
      url: `${window.location.origin}/v1/device/aa:bb:cc:dd:ee:ff?x=1#frag`,
      accessToken: 'access-token'
    });
    const payload = decodePayload(jwt);
    expect(payload.htm).toBe('DELETE');
    expect(payload.htu).toBe(`${window.location.origin}/v1/device/aa:bb:cc:dd:ee:ff`);
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.jti).toBe('string');
    expect(typeof payload.ath).toBe('string');
  });

  it('generates unique jti values for separate proofs', async () => {
    const exported = await generateExportableDpopKeyPair();
    const runtime = await importRuntimeDpopKeyPair(exported);
    const one = decodePayload(await createDpopProof(runtime, { method: 'GET', url: `${window.location.origin}/v1/device` }));
    const two = decodePayload(await createDpopProof(runtime, { method: 'GET', url: `${window.location.origin}/v1/device` }));
    expect(one.jti).not.toBe(two.jti);
  });
});
