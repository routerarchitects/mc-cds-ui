import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';

vi.mock('../utils/config', () => ({
  getConfig: () => ({ cdsApiBaseUrl: '' })
}));

import { addDevice, deleteDevice, listDevices, updateDevice } from '../api/cdsClient';
import type { AuthContextValue } from '../auth/types';

function createAuth(): AuthContextValue {
  return {
    isLoading: false,
    isAuthenticated: true,
    authMode: 'keycloak-dpop',
    isDpopReady: true,
    user: { subject: 'u1' },
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    getAccessToken: () => Promise.resolve('access-token'),
    getDpopProof: (_method: string, _url: string) => Promise.resolve('dpop-proof')
  };
}

describe('cdsClient', () => {
  const auth = createAuth();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch');
  });

  it('treats successful empty list body as []', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));
    const result = await listDevices(auth);
    expect(result).toEqual([]);
  });

  it('treats null list body as []', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('null', { status: 200 }));
    const result = await listDevices(auth);
    expect(result).toEqual([]);
  });

  it('returns array list payload', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([{ serial: 'aa:bb:cc:dd:ee:ff', controller_endpoint: 'openwifi3.routerarchitects.com' }]), { status: 200 })
    );
    const result = await listDevices(auth);
    expect(result).toHaveLength(1);
    expect(result[0]?.serial).toBe('aa:bb:cc:dd:ee:ff');
  });

  it('throws fixed safe error for invalid list shape', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"unexpected":true}', { status: 200 }));
    await expect(listDevices(auth)).rejects.toMatchObject({ message: 'Unexpected response from server.' });
  });

  it('blocks POST on invalid serial before request', async () => {
    await expect(addDevice(auth, { serial: 'device-001', controller_endpoint: 'openwifi3.routerarchitects.com' })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('blocks PUT on invalid serial before request', async () => {
    await expect(updateDevice(auth, { serial: 'serial123', controller_endpoint: 'openwifi3.routerarchitects.com' })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('blocks DELETE on invalid serial before request', async () => {
    await expect(deleteDevice(auth, 'aa/bb')).rejects.toBeInstanceOf(ApiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses same absolute URL with preserved colons for DPoP/fetch in DELETE', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const dpopSpy = vi.fn((_method: string, _url: string) => Promise.resolve('dpop-proof'));
    const authWithSpy: AuthContextValue = { ...auth, getDpopProof: dpopSpy };

    await deleteDevice(authWithSpy, 'AA:BB:CC:DD:EE:FF');

    const expectedUrl = `${window.location.origin}/v1/device/aa:bb:cc:dd:ee:ff`;
    expect(dpopSpy).toHaveBeenCalledWith('DELETE', expectedUrl, 'access-token');
    expect(fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'DELETE',
        body: undefined
      })
    );
  });
});
