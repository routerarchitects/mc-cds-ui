# Prompt for LLM UI Code Generation

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
- Use high-entropy OAuth `state`, `nonce`, and PKCE verifier values per login transaction.
- Validate callback params before token exchange: require `code` and `state`, reject missing/duplicate callback params, verify `state`, and clear transaction state after success/failure.
- The token response must include an ID token. Validate its `nonce` claim against the stored authorization transaction nonce before accepting the login session.
- Reject login and clear transaction/auth state if the ID token is missing, or if the ID token `nonce` is missing or does not match.
- Generate an ES256 / P-256 DPoP key pair in the browser.
- Preserve the same DPoP key across the OIDC authorization redirect and callback.
- If a full-page redirect is used, store redirect-state DPoP key material only in `sessionStorage`, restore it on `/callback`, and clear it on logout, auth failure, or refresh failure.
- After restoring redirect-state DPoP key material from `sessionStorage`, immediately remove the serialized private/public JWK material and import the private key into Web Crypto with `extractable=false` for normal authenticated runtime.
- Callback processing must remove serialized DPoP private JWK material before token exchange or other network requests when possible.
- Do not use `localStorage` for the DPoP private key.
- Do not generate a different DPoP key for the token request than the key used to compute `dpop_jkt`.
- Obtain a Keycloak access token that is DPoP-bound to the browser key.
- Handle Keycloak DPoP nonce challenges for token, refresh, and logout requests.
- If Keycloak returns a DPoP nonce, read the nonce, regenerate the DPoP proof with the `nonce` claim, and retry the request once.
- Do not retry DPoP nonce challenges indefinitely.
- Compute DPoP JWK thumbprints using RFC7638 canonicalization over public JWK fields only: `crv`, `kty`, `x`, `y`.
- Create a new DPoP proof for every CDS API call.
- Use a fresh `jti` for every DPoP proof.
- Set proof `htm` to the actual HTTP method.
- Set proof `htu` to the externally visible request URL without query or fragment.
- Include `ath` as base64url(SHA-256(access_token)) for CDS resource requests.
- Send `Authorization: DPoP <access_token>` and `DPoP: <proof>` for every Admin API request.
- Use same-origin API calls by default: `/v1/device` and `/v1/device/{serial}`.
- Normalize serial with `trim().toLowerCase()`.
- Validate serial with MAC-style pattern `^[0-9a-f]{2}(:[0-9a-f]{2}){5}$`.
- Accept valid serial example: `aa:bb:cc:dd:ee:ff`.
- Reject serial values containing `/`, `?`, `#`, `%`, whitespace, control characters, or any character outside lowercase hex digits and colon.
- For `DELETE /v1/device/{serial}`, normalize serial with `trim().toLowerCase()` and preserve MAC-style `:` in the path segment.
- Build delete path as `/v1/device/${normalizedSerial}` while preserving MAC-style colon characters.
- Use the exact same URL/path string for DPoP `htu` proof generation and the fetch DELETE request.
- Validate serial before add/update/delete requests. If invalid, show a clear inline validation message and do not send the API request.
- For `GET /v1/device`, if JSON response is an array, use it; if `null` or `undefined`, treat it as `[]`.
- For `GET /v1/device`, if JSON response shape is neither array nor nullish, raise/show a fixed safe error such as `Unexpected response from server.`.
- Keep device-list state array-safe so filter/sort/map/spread/render logic only operates on arrays.
- Do not add CORS workarounds in the frontend.
- Handle loading, empty list, success, error, 401, 403, 404, 409, 413, 500, and network failures.
- Add logout support.
- Do not store or use any Keycloak client secret in frontend code.
- Keep access/refresh tokens in memory by default; use `sessionStorage` only for strictly necessary session-scoped redirect/auth state.
- Validate post-login/post-logout return paths against a same-origin allowlist. Allow only relative paths such as `/` or `/callback`. Reject absolute URLs, protocol-relative URLs, and paths containing control characters.
- In `mock` mode, never call real CDS APIs; use mocked responses only. If `VITE_AUTH_MODE=mock` is used outside localhost/dev builds, fail closed.
- Do not use `dangerouslySetInnerHTML`.
- Never render API/auth error payloads as HTML. Render escaped text or fixed safe messages only.
- Production CSP must include at minimum: `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'`.
- If Keycloak uses a separate origin, `connect-src` may include only the configured Keycloak issuer origin. Do not use wildcard origins.
- Validate `controller_endpoint` as a cloud hostname only, such as `openwifi3.routerarchitects.com`, with max length 253 characters; reject port, scheme, path, query, fragment, and credentials.
- Read config from Vite environment variables.
- Keep code modular and easy to maintain.

## Library Guidance

`keycloak-js` is acceptable only if the generated implementation can send DPoP proof headers during the token request, refresh request, and logout request when required by Keycloak. If that is not supported cleanly, implement the OIDC Authorization Code + PKCE flow directly using browser APIs and `fetch`, or use a small OIDC library that allows custom DPoP headers for token/refresh requests.

Any OIDC library used must allow custom DPoP proof generation and nonce retry handling for token, refresh, and logout requests. If the library cannot support DPoP nonce retry behavior cleanly, implement the OIDC requests directly with browser APIs and `fetch`.

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
