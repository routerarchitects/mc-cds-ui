import type { AuthContextValue } from '../auth/types';
import type { Device, DeviceMutationRequest } from '../types/device';
import { getConfig } from '../utils/config';
import { validateSerial } from '../utils/validation';
import { ApiError, safeMessageForStatus } from './errors';

const mockDevices: Device[] = [
  { serial: '60:cf:84:f1:f6:60', controller_endpoint: 'openwifi3.routerarchitects.com' },
  { serial: 'b4:6a:d4:45:f0:19', controller_endpoint: 'openwifi3.routerarchitects.com' }
];

function cleanBaseUrl(): string {
  return getConfig().cdsApiBaseUrl;
}

function buildApiUrl(path: string): string {
  const base = cleanBaseUrl();
  if (!base) return new URL(path, window.location.origin).toString();
  return `${base}${path}`;
}

function normalizeDevice(input: DeviceMutationRequest): DeviceMutationRequest {
  return {
    serial: input.serial.trim().toLowerCase(),
    controller_endpoint: input.controller_endpoint.trim()
  };
}

function assertValidSerial(serial: string): void {
  const message = validateSerial(serial);
  if (message) throw new ApiError(400, message);
}

function assertMockOnly(auth: AuthContextValue): boolean {
  return auth.authMode === 'mock';
}

async function parseError(response: Response): Promise<ApiError> {
  let details = '';
  try {
    details = await response.text();
  } catch {
    details = '';
  }
  return new ApiError(response.status, safeMessageForStatus(response.status), details);
}

async function request(auth: AuthContextValue, method: string, path: string, body?: unknown): Promise<Response> {
  const url = buildApiUrl(path);
  const accessToken = await auth.getAccessToken();
  const dpop = await auth.getDpopProof(method, url, accessToken);
  const headers: HeadersInit = {
    Authorization: `DPoP ${accessToken}`,
    DPoP: dpop
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'omit'
  });
  if (!response.ok) throw await parseError(response);
  return response;
}

export async function listDevices(auth: AuthContextValue): Promise<Device[]> {
  if (assertMockOnly(auth)) return [...mockDevices].sort((a, b) => a.serial.localeCompare(b.serial));
  const response = await request(auth, 'GET', '/v1/device');
  const raw = await response.text();
  if (!raw.trim()) return [];

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError(500, 'Unexpected response from server.');
  }

  if (Array.isArray(payload)) return payload as Device[];
  if (payload == null) return [];

  throw new ApiError(500, 'Unexpected response from server.');
}

export async function addDevice(auth: AuthContextValue, device: DeviceMutationRequest): Promise<void> {
  const normalized = normalizeDevice(device);
  assertValidSerial(normalized.serial);
  if (assertMockOnly(auth)) {
    const existing = mockDevices.find((d) => d.serial === normalized.serial);
    if (existing) existing.controller_endpoint = normalized.controller_endpoint;
    else mockDevices.push(normalized);
    return;
  }
  await request(auth, 'POST', '/v1/device', normalized);
}

export async function updateDevice(auth: AuthContextValue, device: DeviceMutationRequest): Promise<void> {
  const normalized = normalizeDevice(device);
  assertValidSerial(normalized.serial);
  if (assertMockOnly(auth)) {
    const existing = mockDevices.find((d) => d.serial === normalized.serial);
    if (!existing) throw new ApiError(404, safeMessageForStatus(404));
    existing.controller_endpoint = normalized.controller_endpoint;
    return;
  }
  await request(auth, 'PUT', '/v1/device', normalized);
}

export async function deleteDevice(auth: AuthContextValue, serial: string): Promise<void> {
  const normalizedSerial = serial.trim().toLowerCase();
  assertValidSerial(normalizedSerial);
  if (assertMockOnly(auth)) {
    const idx = mockDevices.findIndex((d) => d.serial === normalizedSerial);
    if (idx === -1) throw new ApiError(404, safeMessageForStatus(404));
    mockDevices.splice(idx, 1);
    return;
  }
  // Keep MAC colons unescaped so DPoP htu matches backend r.URL.Path validation.
  await request(auth, 'DELETE', `/v1/device/${normalizedSerial}`);
}
