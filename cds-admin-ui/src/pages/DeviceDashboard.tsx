import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { addDevice, deleteDevice, listDevices, updateDevice } from '../api/cdsClient';
import { ApiError } from '../api/errors';
import { DeleteDeviceDialog } from '../components/DeleteDeviceDialog';
import { DeviceForm } from '../components/DeviceForm';
import { DeviceTable } from '../components/DeviceTable';
import { LoadingState } from '../components/LoadingState';
import { ToastArea, type ToastMessage } from '../components/Toast';
import type { Device, DeviceMutationRequest, DeviceSortKey, SortDirection } from '../types/device';

function formatRefreshTime(value?: Date): string {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value);
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-svg">
      <path d="M12 4c-4.4 0-8 1.6-8 3.5V16.5C4 18.4 7.6 20 12 20s8-1.6 8-3.5v-9C20 5.6 16.4 4 12 4Zm0 1.8c3.8 0 6.2 1.2 6.2 1.7S15.8 9.2 12 9.2 5.8 8 5.8 7.5 8.2 5.8 12 5.8Zm0 5.2c2.6 0 4.9-.5 6.2-1.3v2c0 .5-2.4 1.7-6.2 1.7s-6.2-1.2-6.2-1.7v-2c1.3.8 3.6 1.3 6.2 1.3Zm0 7.2c-3.8 0-6.2-1.2-6.2-1.7v-2c1.3.8 3.6 1.3 6.2 1.3s4.9-.5 6.2-1.3v2c0 .5-2.4 1.7-6.2 1.7Z" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-svg">
      <path d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 12 4.5Zm0 13.2A5.7 5.7 0 1 1 17.7 12 5.7 5.7 0 0 1 12 17.7Zm.9-9h-1.8v4.1l3.4 2 .9-1.5-2.5-1.4V8.7Z" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-svg">
      <path d="M12 3.5 5.5 6v5.2c0 4.4 2.7 8.4 6.5 9.8 3.8-1.4 6.5-5.4 6.5-9.8V6L12 3.5Zm0 2.1 4.8 1.8v3.8c0 3.4-2 6.6-4.8 7.9-2.8-1.3-4.8-4.5-4.8-7.9V7.4L12 5.6Z" fill="currentColor" />
    </svg>
  );
}

let toastId = 1;

export function DeviceDashboard() {
  const auth = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Device | undefined>();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<DeviceSortKey>('serial');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (kind: ToastMessage['kind'], text: string) => {
    setToasts((current) => [...current, { id: toastId++, kind, text }]);
  };

  const showError = (err: unknown) => {
    const message = err instanceof ApiError || err instanceof Error ? err.message : 'Request failed. Please try again.';
    setError(message);
    pushToast('error', message);
  };

  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await listDevices(auth);
      setDevices(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch (err) {
      showError(err);
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const submitDevice = async (device: DeviceMutationRequest) => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      if (selectedDevice) {
        await updateDevice(auth, device);
        pushToast('success', 'Device mapping updated.');
        setSelectedDevice(undefined);
      } else {
        await addDevice(auth, device);
        pushToast('success', 'Device mapping added.');
      }
      await refreshDevices();
    } catch (err) {
      showError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await deleteDevice(auth, deleteTarget.serial);
      pushToast('success', 'Device mapping deleted.');
      setDeleteTarget(undefined);
      await refreshDevices();
    } catch (err) {
      showError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDevices = useMemo(() => {
    const safeDevices = Array.isArray(devices) ? devices : [];
    const query = search.trim().toLowerCase();
    const filtered = query
      ? safeDevices.filter((device) => device.serial.toLowerCase().includes(query) || device.controller_endpoint.toLowerCase().includes(query))
      : safeDevices;
    return [...filtered].sort((a, b) => {
      const comparison = a[sortKey].localeCompare(b[sortKey]);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [devices, search, sortDirection, sortKey]);

  const handleSortChange = (key: DeviceSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div>
          <h2>Device Dashboard</h2>
          <p>Manage device serials and controller endpoint mappings.</p>
        </div>
      </section>

      <div className="summary-grid" aria-label="Dashboard summary">
        <div className="summary-card stat-card">
          <div className="stat-icon stat-icon-blue"><DatabaseIcon /></div>
          <div>
            <span className="summary-label">Total devices</span>
            <strong>{devices.length}</strong>
          </div>
        </div>
        <div className="summary-card stat-card">
          <div className="stat-icon stat-icon-indigo"><ClockIcon /></div>
          <div>
            <span className="summary-label">Last refresh</span>
            <strong>{formatRefreshTime(lastRefresh)}</strong>
          </div>
        </div>
        <div className="summary-card stat-card">
          <div className="stat-icon stat-icon-amber"><ShieldIcon /></div>
          <div>
            <span className="summary-label">Auth mode</span>
            <strong>{auth.authMode === 'mock' ? 'Mock auth' : 'Keycloak DPoP'}</strong>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {isLoading && devices.length === 0 ? <LoadingState label="Loading devices..." /> : null}

      <div className="dashboard-grid">
        <DeviceForm selectedDevice={selectedDevice} isSubmitting={isSubmitting} onSubmit={submitDevice} onCancelEdit={() => setSelectedDevice(undefined)} />
        <DeviceTable
          devices={filteredDevices}
          totalDevices={devices.length}
          search={search}
          sortKey={sortKey}
          sortDirection={sortDirection}
          isLoading={isLoading}
          onSearchChange={setSearch}
          onSortChange={handleSortChange}
          onEdit={setSelectedDevice}
          onDelete={setDeleteTarget}
          onRefresh={() => void refreshDevices()}
        />
      </div>

      <DeleteDeviceDialog device={deleteTarget} isDeleting={isSubmitting} onCancel={() => setDeleteTarget(undefined)} onConfirm={() => void confirmDelete()} />
      <ToastArea messages={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
