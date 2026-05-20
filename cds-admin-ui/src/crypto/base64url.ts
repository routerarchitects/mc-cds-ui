export function base64urlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Base64url(value: string | ArrayBuffer | Uint8Array): Promise<string> {
  let bytes: Uint8Array;
  if (typeof value === 'string') {
    bytes = new TextEncoder().encode(value);
  } else if (value instanceof Uint8Array) {
    bytes = value;
  } else {
    bytes = new Uint8Array(value);
  }
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return base64urlEncode(digest);
}

export function randomBase64url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}
