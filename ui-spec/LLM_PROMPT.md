# Prompt for LLM / ChatGPT UI Code Generation

Generate a production-ready React + Vite + TypeScript Admin UI for the CDS backend.

Use this `ui-spec/` folder as the source of truth:

- `openapi.yaml` for the exact API contract
- `auth.md` for Keycloak + DPoP authentication behavior
- `screens.yaml` for screen layout and interactions
- `components.md` for component/module requirements
- `acceptance-criteria.md` for the validation checklist
- `backend-context.md` for CDS backend behavior and deployment assumptions
- `env.example` for frontend environment variables
- `design-tokens.json` for visual styling guidance

## Current Backend Behavior

- Admin CRUD API path is `/v1/device` for list/create/update.
- Delete API path is `/v1/device/{serial}`.
- `GET /v1/device` lists devices for the validated admin owner.
- `POST /v1/device` creates or upserts a device owned by the validated admin owner.
- `PUT /v1/device` updates an existing owned device.
- `DELETE /v1/device/{serial}` deletes an existing owned device.
- Device fields are `serial` and `controller_endpoint`.
- Admin API calls must use Keycloak-issued DPoP-bound access tokens.

## Required Auth Headers

Every CDS Admin API request must include both headers:

```http
Authorization: DPoP <keycloak_access_token>
DPoP: <fresh_dpop_proof_jwt>
```


## UI Requirements

- Use React + Vite + TypeScript.
- Build a single-page device management dashboard.
- Use page subtitle: `Manage device serials and controller endpoint mappings.`
- Use serial helper text: `Device serial number, usually MAC-style.`
- In the summary/status cards, show `Last refresh` instead of an API base URL card.
- `Last refresh` starts as `Never` and updates after every successful device list load, including manual refresh and refreshes after add/update/delete.
- Use Keycloak login, not a custom username/password form.
- Use Authorization Code + PKCE.
- Generate an ES256 / P-256 DPoP key pair in the browser.
- Obtain a Keycloak access token that is DPoP-bound to the browser key.
- Create a new DPoP proof for every CDS API call.
- Use a fresh `jti` for every DPoP proof.
- Set proof `htm` to the actual HTTP method.
- Set proof `htu` to the externally visible request URL without query or fragment.
- Include `ath` as base64url(SHA-256(access_token)) for CDS resource requests.
- Send `Authorization: DPoP <access_token>` and `DPoP: <proof>` for every Admin API request.
- Use same-origin API calls by default: `/v1/device` and `/v1/device/{serial}`.
- Do not add CORS workarounds in the frontend.
- Handle loading, empty list, success, error, 401, 403, 404, 409, 413, 500, and network failures.
- Add logout support.
- Do not store or use any Keycloak client secret in frontend code.
- Read config from Vite environment variables.
- Keep code modular and easy to maintain.

## Library Guidance

`keycloak-js` is acceptable only if the generated implementation can send DPoP proof headers during the token request, refresh request, and logout request when required by Keycloak. If that is not supported cleanly, implement the OIDC Authorization Code + PKCE flow directly using browser APIs and `fetch`, or use a small OIDC library that allows custom DPoP headers for token/refresh requests.

The generated API client must be explicitly DPoP-aware and must create fresh DPoP proofs for token, refresh, logout when required, and CDS API requests.

## Generate the Full Frontend App

Include:

- `package.json`
- Vite config
- `src/main.tsx`
- `src/App.tsx`
- Auth provider / hook
- DPoP utility module
- OIDC/Keycloak auth module
- API client
- DeviceDashboard
- DeviceTable
- DeviceForm
- Delete confirmation dialog
- Loading/error/toast components
- CSS styling
- `.env.example`
- README with setup, build, and integration instructions

Do not modify the CDS backend unless explicitly asked. Generate only the Admin UI frontend.
