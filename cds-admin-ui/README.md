# CDS Admin UI

Production-oriented React + Vite + TypeScript Admin UI for the Controller Discovery Service (CDS).

The app is generated from the `ui-spec/` requirements package and implements a single-page device management dashboard for:

- `GET /v1/device`
- `POST /v1/device`
- `PUT /v1/device`
- `DELETE /v1/device/{serial}`

Admin API calls use Keycloak-issued DPoP-bound access tokens:

```http
Authorization: DPoP <keycloak_access_token>
DPoP: <fresh_dpop_proof_jwt>
```

## Requirements implemented

- Keycloak OIDC Authorization Code + PKCE flow.
- High-entropy OAuth `state`, `nonce`, and PKCE verifier values.
- Strict callback validation before token exchange.
- Required ID token with nonce validation.
- Browser-generated ES256/P-256 DPoP key pair.
- RFC7638 DPoP JWK thumbprint from public `crv`, `kty`, `x`, `y` fields only.
- Redirect-safe DPoP key persistence using `sessionStorage` only.
- Serialized JWK cleanup immediately after callback restoration.
- Runtime DPoP private key imported into Web Crypto with `extractable=false`.
- DPoP nonce retry handling for token, refresh, and logout requests.
- Access/refresh tokens are memory-only by default.
- Same-origin CDS API calls by default.
- Mock mode is localhost/dev-only and never calls real CDS APIs.
- Fixed safe/escaped error rendering. No `dangerouslySetInnerHTML` usage.
- `controller_endpoint` validation: cloud hostname only, max 253 characters, no scheme/port/path/query/fragment/credentials.
- Last refresh card updates only after successful list loads.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:3000
```

For UI-only development without Keycloak/CDS, use mock mode in `.env`:

```env
VITE_AUTH_MODE=mock
```

Mock mode fails closed outside localhost Vite development and never calls real CDS APIs.

## Production build

```bash
npm run build
```

The static files are created in:

```text
dist/
```

Serve `dist/` with Nginx from the same origin that proxies `/v1/device` to the CDS API.

Example browser/API shape:

```text
https://cds-admin.example.com/          -> Admin UI
https://cds-admin.example.com/v1/device -> CDS Admin API proxy
```

## Environment variables

See `.env.example`.

Important values:

```env
VITE_AUTH_MODE=keycloak-dpop
VITE_KEYCLOAK_ISSUER=https://auth.example.com/realms/cds
VITE_KEYCLOAK_CLIENT_ID=cds-admin-ui
VITE_KEYCLOAK_SCOPE=openid profile email
VITE_CDS_API_BASE_URL=
VITE_KEYCLOAK_REDIRECT_PATH=/callback
VITE_KEYCLOAK_POST_LOGOUT_PATH=/
```

Leave `VITE_CDS_API_BASE_URL` empty for same-origin Nginx deployment.

## Keycloak client expectations

Configure a public SPA client:

- Client ID: `cds-admin-ui`
- Client authentication: off
- Standard flow: on
- PKCE: S256
- DPoP-bound tokens: enabled/required
- Redirect URI: `https://<admin-origin>/callback`
- Web origin: `https://<admin-origin>`
- Scope includes `openid`

The frontend must not use a client secret.

## Production CSP

The production deployment should set at least:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self' https://auth.example.com
```

Replace `https://auth.example.com` with the configured Keycloak issuer origin. Do not use wildcard origins.

## Nginx integration note

Nginx should serve the built React files and proxy `/v1/device` to CDS:

```nginx
root /usr/share/nginx/html;
index index.html;

location /v1/device {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header DPoP $http_dpop;
    proxy_pass http://cds-api:8080;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

## Security notes

- No raw access tokens, refresh tokens, DPoP proofs, or private keys are logged.
- Access/refresh tokens are kept in memory by default.
- Temporary redirect key material is deleted from `sessionStorage` immediately after callback restoration.
- API/auth errors are rendered as safe text only.
