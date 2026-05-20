import { describe, expect, it } from 'vitest';
import { validateControllerEndpoint, validateSerial } from '../utils/validation';

describe('validateSerial', () => {
  it('accepts valid lowercase MAC serial', () => {
    expect(validateSerial('aa:bb:cc:dd:ee:ff')).toBeUndefined();
  });

  it('normalizes case/whitespace by validation input handling', () => {
    expect(validateSerial('  AA:BB:CC:DD:EE:FF  ')).toBeUndefined();
  });

  it('rejects invalid serial formats', () => {
    const invalid = ['aa/bb', 'aa?x=1', 'aa#x', 'aa%2fbb', 'aa bb', 'device-001', 'serial123', 'abc_def'];
    for (const value of invalid) {
      expect(validateSerial(value)).toBe('Enter a MAC-style serial like aa:bb:cc:dd:ee:ff.');
    }
  });
});

describe('validateControllerEndpoint', () => {
  it('accepts valid hostname endpoint', () => {
    expect(validateControllerEndpoint('openwifi3.routerarchitects.com')).toBeUndefined();
  });

  it('rejects scheme, port, path, query, fragment, and credentials', () => {
    expect(validateControllerEndpoint('https://openwifi3.routerarchitects.com')).toContain('scheme');
    expect(validateControllerEndpoint('openwifi3.routerarchitects.com:443')).toContain('port');
    expect(validateControllerEndpoint('openwifi3.routerarchitects.com/path')).toContain('path');
    expect(validateControllerEndpoint('openwifi3.routerarchitects.com?x=1')).toContain('query');
    expect(validateControllerEndpoint('openwifi3.routerarchitects.com#x')).toContain('fragment');
    expect(validateControllerEndpoint('user@openwifi3.routerarchitects.com')).toContain('credentials');
  });

  it('enforces max length 253', () => {
    const tooLong = `${'a'.repeat(64)}.${'b'.repeat(64)}.${'c'.repeat(64)}.${'d'.repeat(64)}`;
    expect(validateControllerEndpoint(tooLong)).toBe('Controller endpoint must be 253 characters or fewer.');
  });
});
