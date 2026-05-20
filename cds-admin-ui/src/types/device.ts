export interface Device {
  serial: string;
  controller_endpoint: string;
}

export interface DeviceMutationRequest {
  serial: string;
  controller_endpoint: string;
}

export type DeviceSortKey = 'serial' | 'controller_endpoint';
export type SortDirection = 'asc' | 'desc';
