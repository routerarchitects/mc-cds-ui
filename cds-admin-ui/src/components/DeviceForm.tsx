import { useEffect, useState } from 'react';
import type { Device, DeviceMutationRequest } from '../types/device';
import { validateControllerEndpoint, validateSerial } from '../utils/validation';

interface Props {
  selectedDevice?: Device;
  isSubmitting: boolean;
  onSubmit: (device: DeviceMutationRequest) => Promise<void>;
  onCancelEdit: () => void;
}

export function DeviceForm({ selectedDevice, isSubmitting, onSubmit, onCancelEdit }: Props) {
  const [serial, setSerial] = useState('');
  const [controllerEndpoint, setControllerEndpoint] = useState('');
  const [errors, setErrors] = useState<{ serial?: string; controller_endpoint?: string }>({});

  const isEdit = !!selectedDevice;

  useEffect(() => {
    if (selectedDevice) {
      setSerial(selectedDevice.serial);
      setControllerEndpoint(selectedDevice.controller_endpoint);
      setErrors({});
      return;
    }
    setSerial('');
    setControllerEndpoint('');
    setErrors({});
  }, [selectedDevice]);

  const reset = () => {
    setSerial('');
    setControllerEndpoint('');
    setErrors({});
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSerial = serial.trim().toLowerCase();
    const normalizedEndpoint = controllerEndpoint.trim();
    const nextErrors = {
      serial: validateSerial(normalizedSerial),
      controller_endpoint: validateControllerEndpoint(normalizedEndpoint)
    };
    setErrors(nextErrors);
    if (nextErrors.serial || nextErrors.controller_endpoint) return;
    await onSubmit({ serial: normalizedSerial, controller_endpoint: normalizedEndpoint });
    if (!isEdit) reset();
  };

  return (
    <section className="card form-card" aria-labelledby="device-form-title">
      <div className="card-header">
        <div>
          <h2 id="device-form-title">{isEdit ? 'Update Device' : 'Add Device'}</h2>
          <p>{isEdit ? 'Update the controller endpoint for a selected device mapping.' : 'Create or upsert a device to controller mapping.'}</p>
        </div>
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="field-group">
          <label htmlFor="serial">Device Serial</label>
          <input
            id="serial"
            type="text"
            value={serial}
            onChange={(event) => setSerial(event.target.value)}
            placeholder="aa:bb:cc:11:22:33"
            aria-describedby="serial-help serial-error"
            aria-invalid={!!errors.serial}
            disabled={isSubmitting || isEdit}
            required
          />
          <p id="serial-help" className="help-text">Device serial number, usually MAC-style.</p>
          {errors.serial && <p id="serial-error" className="error-text">{errors.serial}</p>}
        </div>
        <div className="field-group">
          <label htmlFor="controller_endpoint">Controller Endpoint</label>
          <input
            id="controller_endpoint"
            type="text"
            value={controllerEndpoint}
            onChange={(event) => setControllerEndpoint(event.target.value)}
            placeholder="openwifi3.routerarchitects.com"
            aria-describedby="endpoint-help endpoint-error"
            aria-invalid={!!errors.controller_endpoint}
            disabled={isSubmitting}
            required
            maxLength={253}
          />
          <p id="endpoint-help" className="help-text">Cloud hostname only, for example openwifi3.routerarchitects.com.</p>
          {errors.controller_endpoint && <p id="endpoint-error" className="error-text">{errors.controller_endpoint}</p>}
        </div>
        <div className="form-actions">
          {isEdit && (
            <button type="button" className="button button-secondary" onClick={onCancelEdit} disabled={isSubmitting}>
              Cancel
            </button>
          )}
          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Device' : 'Add Device'}
          </button>
        </div>
      </form>
    </section>
  );
}
