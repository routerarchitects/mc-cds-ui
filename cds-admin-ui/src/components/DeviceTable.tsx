import type { Device, DeviceSortKey, SortDirection } from '../types/device';

interface Props {
  devices: Device[];
  totalDevices: number;
  search: string;
  sortKey: DeviceSortKey;
  sortDirection: SortDirection;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSortChange: (key: DeviceSortKey) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onRefresh: () => void;
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-svg button-icon-svg">
      <path d="M12 5a7 7 0 0 1 6.6 4.8h-2.3l3.2 3.3 3.2-3.3h-2.2A8.9 8.9 0 0 0 3 12h1.8A7.2 7.2 0 0 1 12 5Zm-7.5 5.8L1.3 14h2.2A8.9 8.9 0 0 0 21 12h-1.8A7.2 7.2 0 0 1 12 19a7 7 0 0 1-6.6-4.8h2.3l-3.2-3.4Z" fill="currentColor" />
    </svg>
  );
}

export function DeviceTable({ devices, totalDevices, search, sortKey, sortDirection, isLoading, onSearchChange, onSortChange, onEdit, onDelete, onRefresh }: Props) {
  const sortLabel = (key: DeviceSortKey) => (sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <section className="card table-card" aria-labelledby="device-table-title">
      <div className="card-header table-card-header">
        <div>
          <h2 id="device-table-title">Devices</h2>
          <p>Search, sort, refresh, edit, or delete mappings.</p>
        </div>
        <button type="button" className="button button-secondary button-with-icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshIcon />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      <div className="table-toolbar">
        <label htmlFor="device-search" className="sr-only">Search devices</label>
        <div className="search-field">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            id="device-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search serial or controller endpoint"
          />
        </div>
        <div className="table-count">Showing {devices.length} of {totalDevices}</div>
      </div>
      {devices.length === 0 ? (
        <div className="empty-state">
          <strong>No devices found</strong>
          <p>{search ? 'Try another search term.' : 'Add a device mapping to get started.'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" className="table-sort" onClick={() => onSortChange('serial')}>
                    Serial{sortLabel('serial')}
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="table-sort" onClick={() => onSortChange('controller_endpoint')}>
                    Controller Endpoint{sortLabel('controller_endpoint')}
                  </button>
                </th>
                <th scope="col" className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.serial}>
                  <td><code>{device.serial}</code></td>
                  <td>{device.controller_endpoint}</td>
                  <td className="row-actions">
                    <button type="button" className="button button-small button-secondary" onClick={() => onEdit(device)}>
                      Edit
                    </button>
                    <button type="button" className="button button-small button-danger-ghost" onClick={() => onDelete(device)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
