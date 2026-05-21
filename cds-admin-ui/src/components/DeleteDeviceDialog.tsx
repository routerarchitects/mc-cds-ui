import type { Device } from '../types/device';

export function DeleteDeviceDialog({ device, isDeleting, onCancel, onConfirm }: { device?: Device; isDeleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!device) return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h2 id="delete-title">Delete device mapping?</h2>
        <p>
          This will delete the mapping for <strong>{device.serial}</strong>. This action cannot be undone.
        </p>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="button button-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
