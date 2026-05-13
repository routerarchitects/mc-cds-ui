# CDS Admin UI Component Requirements

## Technology Preference

Generate the UI as a React + Vite + TypeScript app. Styling may use Tailwind CSS, plain CSS modules, or a small component library. Keep the code clean, modular, and easy to maintain.

The generated app must be a single-page device dashboard for the first version.

## Component Tree

```text
App
└── AuthProvider
    └── AuthGuard
        └── AppLayout
            └── DeviceDashboard
                ├── SummaryBar
                ├── DeviceForm
                ├── DeviceTable
                ├── DeleteDeviceDialog
                └── Toast/Alert area
```

## Required Files / Modules

Recommended structure:

```text
src/
├── api/
│   └── cdsClient.ts
├── auth/
│   ├── AuthProvider.tsx
│   ├── oidc.ts
│   ├── types.ts
│   └── useAuth.ts
├── crypto/
│   ├── base64url.ts
│   ├── dpop.ts
│   └── pkce.ts
├── components/
│   ├── AppLayout.tsx
│   ├── DeleteDeviceDialog.tsx
│   ├── DeviceForm.tsx
│   ├── DeviceTable.tsx
│   ├── LoadingState.tsx
│   └── Toast.tsx
├── pages/
│   └── DeviceDashboard.tsx
├── types/
│   └── device.ts
├── App.tsx
├── main.tsx
└── styles.css
```

If a library is used for OIDC, keep the same architectural separation and ensure it can support DPoP proofs for token, refresh, logout, and resource requests.

## AuthProvider

Purpose: isolate Keycloak/OIDC + DPoP integration from the CRUD components.

Responsibilities:

- Initialize authentication using Keycloak issuer discovery.
- Generate or load a session-scoped ES256/P-256 DPoP key.
- Generate PKCE verifier/challenge for login.
- Redirect unauthenticated users to Keycloak when auth mode is `keycloak-dpop`.
- Handle the authorization callback and exchange code for DPoP-bound tokens.
- Refresh tokens before API calls when near expiry, using a DPoP proof for the refresh token request.
- Expose current user details from the parsed token when available.
- Expose `getAccessToken()` for the API client.
- Expose `getDpopProof(method, url, accessToken)` or an equivalent helper for the API client.
- Expose `logout()`.
- Optionally support mock auth mode for UI-only development.

Suggested interface:

```ts
export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  user?: {
    username?: string;
    email?: string;
    subject?: string;
    roles?: string[];
  };
  getAccessToken: () => Promise<string>;
  createDpopProof: (args: {
    method: string;
    url: string;
    accessToken?: string;
  }) => Promise<string>;
  logout: () => Promise<void> | void;
  authMode: "keycloak-dpop" | "mock";
  dpopReady: boolean;
}
```

## DPoP Utility Module

Purpose: centralize Web Crypto DPoP behavior.

Required functions or equivalents:

```ts
export async function generateDpopKeyPair(): Promise<CryptoKeyPair>;
export async function exportPublicJwk(publicKey: CryptoKey): Promise<JsonWebKey>;
export async function jwkThumbprint(publicJwk: JsonWebKey): Promise<string>;
export async function sha256Base64Url(input: string): Promise<string>;
export async function createDpopProof(args: {
  keyPair: CryptoKeyPair;
  publicJwk: JsonWebKey;
  method: string;
  url: string;
  accessToken?: string;
  nonce?: string;
}): Promise<string>;
```

Implementation requirements:

- Use `crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, ...)`.
- Sign with ECDSA SHA-256.
- Convert Web Crypto ECDSA DER/raw signature output into JOSE ES256 format if required by the browser result format.
- Use base64url encoding without padding.
- Use header `typ: "dpop+jwt"`, `alg: "ES256"`, and the public JWK.
- Generate a new `crypto.randomUUID()` or equivalent random `jti` for every proof.
- Use Unix seconds for `iat`.
- Include `ath` for CDS resource requests.
- Do not include query string or fragment in `htu`.

## PKCE Utility Module

Purpose: centralize PKCE behavior.

Required functions or equivalents:

```ts
export function createCodeVerifier(): string;
export async function createCodeChallenge(verifier: string): Promise<string>;
```

Use S256 only.

## AuthGuard

Purpose: render protected content only after authentication is complete.

Behavior:

- While auth initializes, show a loading screen.
- If authenticated, render children.
- If unauthenticated in Keycloak DPoP mode, redirect is handled by auth initialization.
- If auth fails, show a clear error and a retry/login button.
- Show a clear unsupported-browser message if Web Crypto / P-256 / SHA-256 is unavailable.

## AppLayout

Purpose: provide the shell for the admin dashboard.

Required UI:

- Header with app title: `CDS Admin`.
- Logged-in username/email if available.
- Logout button.
- Main content area with responsive max width.


## SummaryBar

Purpose: show useful dashboard status without exposing unnecessary backend implementation details.

Required cards:

- `Total devices`: show the current number of loaded device mappings.
- `Last refresh`: show `Never` before the first successful device list load, then show the local time of the most recent successful list refresh.
- `Auth mode`: show `Mock auth` or `Keycloak DPoP` in a non-sensitive way.
- `DPoP`: show whether DPoP is ready/enabled without exposing tokens, proofs, or keys.

Behavior:

- Do not show an `API base URL` card in the main dashboard.
- `Last refresh` updates after every successful `listDevices()` call.
- Because add, update, and delete all refresh the device list on success, `Last refresh` must also update after successful add, update, and delete flows.
- Failed refreshes must not update the `Last refresh` timestamp.

## DeviceDashboard

Purpose: main CRUD screen.

Responsibilities:

- Load devices on mount after authentication.
- Maintain `devices`, `loading`, `error`, `selectedDevice`, and form mode state.
- Connect form submit to create/update APIs.
- Connect table actions to edit/delete.
- Refresh table after successful create/update/delete and update the `Last refresh` card after the refreshed list loads successfully.
- Show empty state when no devices are returned.
- Show forbidden state for 403 responses.
- Display useful messages for auth/session/API errors.

## DeviceForm

Purpose: create and update device mappings.

Props:

```ts
interface DeviceFormProps {
  mode: "create" | "edit";
  initialValue?: Device | null;
  isSubmitting?: boolean;
  onSubmit: (device: DeviceInput) => Promise<void> | void;
  onCancelEdit?: () => void;
}
```

Fields:

- `serial`
  - required
  - text input
  - trim whitespace
  - lower-case on submit
  - disable editing of serial in edit mode unless the implementation has a clear reason not to
- `controller_endpoint`
  - required
  - text input
  - trim whitespace

Validation:

- Do not submit if `serial` is empty.
- Do not submit if `controller_endpoint` is empty.
- Show inline validation messages.

Buttons:

- Create mode: `Add Device`, `Reset`
- Edit mode: `Update Device`, `Cancel`

## DeviceTable

Purpose: list devices and expose row actions.

Props:

```ts
interface DeviceTableProps {
  devices: Device[];
  loading?: boolean;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onRefresh: () => void;
}
```

Columns:

- Serial
- Controller Endpoint
- Actions

Features:

- Search/filter by serial or controller endpoint.
- Sort by serial and controller endpoint.
- Refresh button.
- Empty state.
- Loading state.

Row actions:

- Edit
- Delete

## DeleteDeviceDialog

Purpose: protect destructive delete operation.

Props:

```ts
interface DeleteDeviceDialogProps {
  device: Device | null;
  open: boolean;
  isDeleting?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}
```

Behavior:

- Show serial in confirmation message.
- Require explicit confirmation button click.
- Close on success.
- Keep open and show error on failure.

## cdsClient

Purpose: centralize all CDS API calls.

Responsibilities:

- Read API base URL from `VITE_CDS_API_BASE_URL` internally in the API client.
- Default to same-origin API paths when `VITE_CDS_API_BASE_URL` is empty.
- Get/refresh access token before every request.
- Build the exact request URL that the browser will call.
- Create a fresh DPoP proof for every request using the exact method and URL.
- Send `Authorization: DPoP <token>`.
- Send `DPoP: <proof>`.
- Send `Content-Type: application/json` for POST/PUT.
- Do not send a JSON body for DELETE `/v1/device/{serial}`.
- Parse JSON for GET/POST responses.
- Correctly handle 204 responses with no body.
- Convert HTTP errors into useful UI errors.

Required functions:

```ts
export async function listDevices(): Promise<Device[]>;
export async function addDevice(input: DeviceInput): Promise<void>;
export async function updateDevice(input: DeviceInput): Promise<void>;
export async function deleteDevice(serial: string): Promise<void>;
```

Expected request paths:

```text
GET    /v1/device
POST   /v1/device
PUT    /v1/device
DELETE /v1/device/{encodeURIComponent(serial)}
```

## Types

```ts
export interface Device {
  serial: string;
  controller_endpoint: string;
}

export interface DeviceInput {
  serial: string;
  controller_endpoint: string;
}
```

## Error Handling

Handle these cases:

- 400: validation or bad request error.
- 401: session expired, invalid access token, missing/invalid DPoP proof, or replayed DPoP proof.
- 403: user lacks required role or invalid admin client.
- 404: device not found on update/delete.
- 409: owner conflict or write conflict.
- 413: request body too large.
- 500: server configuration/JWKS/internal error.
- Network/TLS failures.

Do not log raw tokens or DPoP proofs.
