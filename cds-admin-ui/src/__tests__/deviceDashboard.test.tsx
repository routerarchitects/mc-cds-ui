import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceDashboard } from '../pages/DeviceDashboard';

const authMock = { authMode: 'keycloak-dpop' };
vi.mock('../auth/useAuth', () => ({
  useAuth: () => authMock
}));

const api = vi.hoisted(() => ({
  listDevices: vi.fn(),
  addDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn()
}));

vi.mock('../api/cdsClient', () => api);

describe('DeviceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Last refresh as Never initially', async () => {
    api.listDevices.mockImplementation(() => new Promise(() => {}));
    render(<DeviceDashboard />);
    expect(screen.getByText('Last refresh')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('successful load updates summary and supports search/sort', async () => {
    api.listDevices.mockResolvedValue([
      { serial: 'bb:bb:bb:bb:bb:bb', controller_endpoint: 'z-host.example.com' },
      { serial: 'aa:aa:aa:aa:aa:aa', controller_endpoint: 'a-host.example.com' }
    ]);
    render(<DeviceDashboard />);

    await waitFor(() => expect(api.listDevices).toHaveBeenCalled());
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();

    const search = screen.getByPlaceholderText('Search serial or controller endpoint');
    fireEvent.change(search, { target: { value: 'z-host' } });
    expect(screen.getByText('bb:bb:bb:bb:bb:bb')).toBeInTheDocument();
    expect(screen.queryByText('aa:aa:aa:aa:aa:aa')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /controller endpoint/i }));
    expect(screen.getByText('a-host.example.com')).toBeInTheDocument();
  });

  it('failed load shows error and keeps Last refresh at Never', async () => {
    api.listDevices.mockRejectedValue(new Error('boom'));
    render(<DeviceDashboard />);
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Never').length).toBeGreaterThan(0);
  });

  it('empty list shows empty state', async () => {
    api.listDevices.mockResolvedValue([]);
    render(<DeviceDashboard />);
    await waitFor(() => expect(api.listDevices).toHaveBeenCalled());
    expect(screen.getAllByText('No devices found').length).toBeGreaterThan(0);
  });
});
