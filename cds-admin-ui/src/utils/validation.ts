const serialPattern = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/;

export function validateSerial(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 'Device serial is required.';
  if (!serialPattern.test(trimmed)) return 'Enter a MAC-style serial like aa:bb:cc:dd:ee:ff.';
  return undefined;
}

export function validateControllerEndpoint(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Controller endpoint is required.';
  if (trimmed.length > 253) return 'Controller endpoint must be 253 characters or fewer.';
  if (trimmed.includes('://')) return 'Enter a cloud hostname only. Do not include a scheme.';
  if (/[/?#@]/.test(trimmed)) return 'Do not include path, query, fragment, or credentials.';
  if (trimmed.includes(':')) return 'Do not include a port.';
  const labels = trimmed.split('.');
  const labelPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  if (labels.length < 2 || labels.some((label) => !labelPattern.test(label))) {
    return 'Enter a hostname only, for example openwifi3.routerarchitects.com.';
  }
  return undefined;
}
