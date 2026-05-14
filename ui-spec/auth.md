# CDS Admin UI Authentication Requirements

## Goal

The CDS Admin UI must authenticate human administrators using Keycloak and send Keycloak-issued DPoP-bound access tokens to the CDS Admin API.

The Admin UI must not implement its own username/password login form. Login must be delegated to the standard Keycloak login page.

## Identity Provider

- Provider: Keycloak
- Protocol: OpenID Connect / OAuth 2.0
- Frontend flow: Authorization Code Flow with PKCE S256
- Token used by CDS API calls: Keycloak JWT access token
- Token binding: DPoP-bound access token
- Resource request authorization scheme: `DPoP`

## Required Runtime Config

Use environment variables similar to:

```env
VITE_AUTH_MODE=keycloak-dpop
VITE_KEYCLOAK_ISSUER=https://auth.example.com/realms/cds
VITE_KEYCLOAK_CLIENT_ID=cds-admin-ui
VITE_KEYCLOAK_SCOPE=openid profile email
VITE_CDS_API_BASE_URL=
```

`VITE_CDS_API_BASE_URL` should normally be empty for same-origin API calls. If set, it must be an absolute API origin used only for special dev cases.

## Keycloak Realm and Client

Expected Keycloak configuration:

- Realm: `cds`
- Frontend client ID: `cds-admin-ui`
- Client type: public SPA client
- Client authentication: Off
- Standard flow: On
- PKCE method: S256
- DPoP-bound tokens: enabled/required for the client
- Valid redirect URI: Admin UI callback URL, for example `https://cds-admin.example.com/callback`
- Web origin: Admin UI origin, for example `https://cds-admin.example.com`
- Required backend role: `cds-admin`
- Required backend audience: `cds-service`

The frontend client must not have a client secret. Do not store any Keycloak secret in frontend code, `.env`, browser storage, or the generated JavaScript bundle.

## Access Token Requirements

The CDS backend expects the access token to contain values equivalent to:

```json
{
  "iss": "https://auth.example.com/realms/cds",
  "aud": "cds-service",
  "azp": "cds-admin-ui",
  "resource_access": {
    "cds-service": {
      "roles": ["cds-admin"]
    }
  },
  "cnf": {
    "jkt": "<dpop-public-key-thumbprint>"
  }
}
```

The frontend may inspect token claims only to improve UI messages. Frontend role checks are not a security boundary.

## Browser DPoP Key

The Admin UI must generate a browser-held DPoP key pair:

- Algorithm: ECDSA P-256 / ES256
- Use Web Crypto when available
- Prefer memory or session-scoped storage
- Do not store long-lived private keys in `localStorage`
- Keep the same DPoP key for the login/session
- Use the same DPoP key for token request, token refresh, logout when required, and CDS API calls

## Redirect-Safe DPoP Key Persistence

The Admin UI must preserve the same DPoP key across the OIDC authorization redirect and callback.

Generate the DPoP key before starting the authorization request. If a full-page redirect is used, export and store the private/public JWK only in `sessionStorage` as session-scoped auth state before redirecting to Keycloak. On `/callback`, restore the same key from `sessionStorage` before exchanging the authorization code for tokens.

After restoring redirect-state DPoP key material from `sessionStorage` on `/callback`, the app must immediately remove the serialized private/public JWK material from `sessionStorage` and import the private key into Web Crypto with `extractable=false` for normal authenticated runtime.

The serialized DPoP private JWK must not remain in `sessionStorage` after callback key restoration. Callback processing must remove serialized DPoP private JWK material before performing token exchange or any other network request when possible. If import fails, the app must clear the serialized JWK material and restart login.

The token request must use the same DPoP key whose public key thumbprint was sent as `dpop_jkt` during the authorization request.

Clear the session-scoped DPoP key material on logout, auth failure, refresh failure, or when starting a new login flow.

Do not store the DPoP private key in `localStorage`. Do not persist DPoP private key material beyond the browser session.

## OAuth Callback Validation

The authorization transaction must use cryptographically random `state`, `nonce`, and PKCE verifier values with at least 128 bits of entropy.

Before token exchange on `/callback`, the app must:

- verify callback `state` matches the stored transaction `state`
- verify required callback params are present (`code`, `state`), reject missing params
- reject duplicate callback params
- use the original stored PKCE verifier for the code exchange

After callback success or failure, clear callback transaction state (`state`, `nonce`, PKCE verifier, redirect-state metadata) so it cannot be replayed.

After token exchange, if an ID token is returned, validate the ID token `nonce` claim against the stored authorization transaction nonce before accepting the login session. If the nonce is missing or does not match, reject the login, clear transaction/auth state, and require a new login.

The public JWK must have this form:

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "...",
  "y": "..."
}
```

DPoP JWK thumbprint computation must use RFC7638 canonicalization over public JWK fields only: `crv`, `kty`, `x`, `y`. Do not include private fields or non-thumbprint members.

## DPoP Proof Header

Every DPoP proof JWT header must include:

```json
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  }
}
```

## DPoP Proof Body for CDS Resource Requests

Every CDS API request must use a freshly generated DPoP proof body:

```json
{
  "jti": "fresh-random-id",
  "htm": "GET",
  "htu": "https://cds-admin.example.com/v1/device",
  "iat": 1710000000,
  "ath": "base64url-sha256-access-token"
}
```

Rules:

- `jti` must be unique for every proof/request.
- `htm` must equal the actual request method in uppercase.
- `htu` must equal the actual external request URL without query string or fragment.
- `iat` must be current Unix time in seconds.
- `ath` must be base64url(SHA-256(access_token)).
- Do not reuse DPoP proofs.

## Token Request Binding

When exchanging the authorization code for tokens, the token request must include a DPoP proof in the `DPoP` header. The proof should be signed by the browser DPoP private key and use the Keycloak token endpoint URL as `htu`.

If Keycloak/client policy requires strict OIDC DPoP binding, include the public key thumbprint using the `dpop_jkt` authorization request parameter.

The generated code should discover Keycloak endpoints from:

```text
<VITE_KEYCLOAK_ISSUER>/.well-known/openid-configuration
```

Required endpoints from discovery:

- `authorization_endpoint`
- `token_endpoint`
- `end_session_endpoint` when available

## DPoP Nonce Handling

For token, refresh, and logout requests, Keycloak may require a DPoP nonce.

If Keycloak returns a DPoP nonce challenge, the app must read the nonce from the response header, such as `DPoP-Nonce`, or from the error response when provided. The app must then regenerate the DPoP proof with the `nonce` claim and retry the request once.

The app must not retry indefinitely. If the nonce retry fails, the app must treat the request as failed and show a clear auth error or force a new login as appropriate.

Nonce handling applies to:

- authorization code token exchange
- refresh token requests
- logout/end-session requests when Keycloak requires DPoP

## Token Storage and Redirect Rules

- Access and refresh tokens must be memory-only by default.
- `sessionStorage` may be used only for strictly necessary session-scoped redirect/auth transaction state.
- Post-login and post-logout return paths must be validated against a same-origin allowlist.
- Allow only relative return paths such as `/` or `/callback`.
- Reject absolute URLs, protocol-relative URLs, and paths containing control characters.

## Token Refresh

If refresh tokens are used, refresh requests for a DPoP-bound public client must also include a fresh DPoP proof signed with the same DPoP private key.

Before every CDS API request, the app should ensure the access token is valid. If it is close to expiry, refresh it with a DPoP proof. If refresh fails, clear session state and redirect to Keycloak login.

## Resource API Headers

Send CDS Admin API requests with:

```http
Authorization: DPoP <keycloak_access_token>
DPoP: <fresh_dpop_proof_jwt>
Content-Type: application/json
```

`Content-Type` is required for `POST` and `PUT`. Do not send a JSON body for `DELETE /v1/device/{serial}`.

## Logout

Provide a logout action. It should clear local/session auth state and use Keycloak logout/end-session when available. If Keycloak requires DPoP for logout with a refresh token, include the required DPoP proof.

## Optional Development Mock Mode

The generated UI may include optional mock mode for UI-only development:

```env
VITE_AUTH_MODE=mock
VITE_MOCK_ACCESS_TOKEN=dev-token
```

If mock mode is implemented:

- Keep the same `useAuth()` interface as real auth mode.
- Clearly label mock mode in the UI.
- Do not enable mock mode by default in production builds.
- Do not treat mock auth as secure.
- Mock mode may bypass real DPoP only for offline UI development; real API integration must use Keycloak DPoP.
- Mock mode must never call real CDS APIs; it must use mocked API responses only.
- If `VITE_AUTH_MODE=mock` is used outside localhost/dev builds, the app must fail closed and refuse startup.

## Frontend XSS and Content Security Requirements

- Do not use `dangerouslySetInnerHTML` for auth/API/UI messages.
- Never render API or auth error payloads as HTML.
- Escape or safely render all server-originated strings as plain text.
- Production deployment must define a Content Security Policy with at least:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'
```

If Keycloak is on a separate origin, `connect-src` may also include the configured Keycloak issuer origin required for OIDC discovery, token, refresh, and logout requests. Do not allow arbitrary wildcard origins.

## Backend Validation Reminder

The Admin UI only obtains tokens and generates DPoP proofs. The CDS backend validates tokens/proofs and enforces authorization.
