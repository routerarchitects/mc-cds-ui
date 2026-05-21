import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeviceForm } from '../components/DeviceForm';

describe('DeviceForm', () => {
  it('clears fields when edit mode exits', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancelEdit = vi.fn();

    const { rerender } = render(
      <DeviceForm
        selectedDevice={{ serial: 'aa:bb:cc:dd:ee:ff', controller_endpoint: 'openwifi3.routerarchitects.com' }}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancelEdit={onCancelEdit}
      />
    );

    expect(screen.getByLabelText('Device Serial')).toHaveValue('aa:bb:cc:dd:ee:ff');
    expect(screen.getByLabelText('Controller Endpoint')).toHaveValue('openwifi3.routerarchitects.com');

    rerender(<DeviceForm selectedDevice={undefined} isSubmitting={false} onSubmit={onSubmit} onCancelEdit={onCancelEdit} />);

    expect(screen.getByLabelText('Device Serial')).toHaveValue('');
    expect(screen.getByLabelText('Controller Endpoint')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Add Device' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
