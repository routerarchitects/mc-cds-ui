# Backend Context for UI Generation

## Existing Service

The backend repository is `ra-cds-service`. It is a Go service that stores and serves device serial to controller endpoint mappings using PostgreSQL.

The Admin UI must call the existing CDS admin APIs. Do not create a custom login form in the UI. Login is handled by Keycloak.

## Deployment Target

The agreed deployment model is:

```text
Browser
  -> Nginx
       -> serves React Admin UI static files
       -> proxies /v1/device requests to cds-api:8080
  -> Keycloak through its public auth hostname for login/token flows

cds-api
  -> PostgreSQL cds database

Keycloak
  -> PostgreSQL keycloak database
```

Admin UI and Admin API must share the same browser origin.

Production example:

```text
https://cds-admin.example.com/          -> Admin UI
https://cds-admin.example.com/v1/device -> Admin API proxy
https://auth.example.com/realms/cds     -> Keycloak
```

Local/dev example after Nginx integration:

```text
https://localhost:5443/          -> Admin UI
https://localhost:5443/v1/device -> Admin API proxy
```

The React app should call the API using relative paths by default, such as `/v1/device`, so no CORS is required in the final Nginx deployment.

## Current Admin APIs

The admin API uses these routes:

```text
GET    /v1/device          -> list owned devices
POST   /v1/device          -> create or upsert owned device
PUT    /v1/device          -> update owned device
DELETE /v1/device/{serial} -> delete owned device
```

The API contract in `openapi.yaml` is the source of truth.

## Data Shape

Device object:

```json
{
  "serial": "b4:6a:d4:45:f0:19",
  "controller_endpoint": "openwifi3.routerarchitects.com"
}
```

Create/update request body:

```json
{
  "serial": "b4:6a:d4:45:f0:19",
  "controller_endpoint": "openwifi3.routerarchitects.com"
}
```

Delete request uses the path parameter, not a JSON body:

```text
DELETE /v1/device/b4:6a:d4:45:f0:19
```

For delete path construction, the UI must normalize serial with `trim().toLowerCase()` and preserve MAC-style `:` characters in the path segment.
The normalized serial must be non-empty after trim.
The normalized serial must match `^[a-z0-9:._-]+$`.
The UI must reject serials containing `/`, `?`, `#`, `%`, whitespace, or control characters.
MAC-style serials such as `aa:bb:cc:dd:ee:ff` are supported examples, not the only allowed format.
Build delete path as `/v1/device/${normalizedSerial}`.

## Current Authentication Behavior

Admin APIs require Keycloak-issued DPoP-bound access tokens.

Every Admin API request must send:

```http
Authorization: DPoP <keycloak_access_token>
DPoP: <fresh_dpop_proof_jwt>
```

The CDS backend validates:

- Keycloak access token signature using JWKS
- `kid` lookup and JWKS refresh behavior
- issuer
- audience
- expiry / not-before
- admin UI client (`azp` / `client_id`)
- required role in `resource_access[KEYCLOAK_AUDIENCE].roles`
- `cnf.jkt`
- DPoP proof signature
- DPoP proof `htm`
- DPoP proof `htu`
- DPoP proof `iat`
- DPoP proof `ath`
- DPoP proof `jti` replay protection
- DPoP proof public key thumbprint matches access token `cnf.jkt`

The frontend obtains the token and generates proofs. The backend remains the security boundary.

## DPoP URL Rule

For CDS API calls, the `htu` claim must equal the externally visible request URL without query string or fragment.
For `DELETE /v1/device/{serial}`, build one normalized delete path, resolve it against the configured API origin or current origin to produce the exact browser request URL, and use that same absolute external URL without query string or fragment as the DPoP `htu` input and fetch DELETE URL.
Add/update/delete must validate serial before sending any API request.

If the browser calls:

```text
https://cds-admin.example.com/v1/device
```

then proof `htu` must be:

```text
https://cds-admin.example.com/v1/device
```

If the browser calls:

```text
https://localhost:5443/v1/device
```

then proof `htu` must be:

```text
https://localhost:5443/v1/device
```

Do not use the internal URL `http://cds-api:8080` in the browser or in DPoP proofs.

## Device-facing API Reminder

The device-facing route is separate:

```text
GET /v1/devices/{serial}
```

It is protected by Nginx mTLS and is not part of the Admin UI CRUD workflow.

## Ownership Note

Device ownership is enforced by the backend from the validated admin identity. The frontend should not try to send or choose owner scope.

## CORS Note

The final deployment serves Admin UI and Admin API from the same origin. Do not design the UI around cross-origin API calls. `VITE_CDS_API_BASE_URL` should default to empty or same-origin, not `https://localhost:5443` when the app is served by the same Nginx admin origin.
