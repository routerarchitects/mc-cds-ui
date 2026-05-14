# CDS Admin UI Acceptance Criteria

## Authentication and DPoP

1. Opening the Admin UI while unauthenticated redirects the user to Keycloak login.
2. After successful Keycloak login, the user returns to the Admin UI.
3. After login, the Device Dashboard is displayed automatically.
4. The Admin UI uses Authorization Code Flow with PKCE S256.
5. OAuth login transaction uses high-entropy `state`, `nonce`, and PKCE verifier values.
6. Callback processing verifies `state` before token exchange.
7. If an ID token is returned, the app validates the ID token `nonce` claim against the stored authorization transaction nonce before accepting the login session.
8. If the ID token `nonce` is missing or does not match, the app rejects login, clears transaction/auth state, and requires a new login.
9. Callback processing rejects missing required callback params (`code`, `state`).
10. Callback processing rejects duplicate callback params.
11. Callback transaction state is cleared after callback success or failure.
12. No Keycloak client secret exists in frontend code, frontend `.env`, browser storage, or generated bundle.
13. The app generates an ES256 / P-256 DPoP key pair in the browser.
14. DPoP JWK thumbprint computation follows RFC7638 canonicalization over public fields only (`crv`, `kty`, `x`, `y`).
15. The app obtains a DPoP-bound Keycloak access token containing `cnf.jkt`.
16. The token request to Keycloak includes a DPoP proof when DPoP-bound tokens are required.
17. If strict Keycloak DPoP policy requires `dpop_jkt`, the authorization request includes it.
18. The app uses the same DPoP key for token request, refresh, logout when required, and CDS API calls in the same session.
19. The app preserves the same DPoP key across the authorization redirect and callback.
20. The app does not generate a different DPoP key for the token request than the key used to compute `dpop_jkt`.
21. If redirect-safe storage is needed, the app stores DPoP key material only in `sessionStorage`.
22. The app clears session-scoped DPoP key material on logout, auth failure, refresh failure, or a new login flow.
23. The app does not store the DPoP private key in `localStorage`.
24. After restoring DPoP key material on callback, the app immediately removes serialized DPoP JWK material from `sessionStorage`.
25. The app imports the restored DPoP private key into Web Crypto with `extractable=false` for normal authenticated runtime.
26. The app does not leave serialized DPoP private JWK material in `sessionStorage` after callback key restoration.
27. Access and refresh tokens remain memory-only by default.
28. Before every CDS API request, the app ensures the access token is valid and refreshes it if near expiry.
29. Refresh requests for DPoP-bound tokens include a fresh DPoP proof signed with the same key.
30. Token requests handle DPoP nonce challenges by retrying once with the returned nonce.
31. Refresh requests handle DPoP nonce challenges by retrying once with the returned nonce.
32. Logout requests handle DPoP nonce challenges when Keycloak requires DPoP for logout.
33. DPoP nonce retry logic does not loop indefinitely.
34. If nonce retry fails, the app clears unsafe auth state and shows a clear auth error or requires login again.
35. If token refresh fails, the app clears session state and redirects or prompts the user to log in again.
36. The logout button logs the user out through Keycloak when possible and clears local/session auth state.
37. Post-login and post-logout return targets are restricted to a same-origin allowlist and only relative paths such as `/` or `/callback`.
38. Post-login and post-logout flows reject absolute URLs, protocol-relative URLs, and return paths containing control characters.
39. The app displays a clear unsupported-browser error if required Web Crypto features are unavailable.

## API Integration

40. All CDS admin API calls use `Authorization: DPoP <Keycloak access token>`.
41. All CDS admin API calls include `DPoP: <fresh proof JWT>`.
42. A new DPoP proof is generated for every API request.
43. Every DPoP proof uses a fresh `jti`.
44. DPoP proof `htm` matches the actual HTTP method.
45. DPoP proof `htu` matches the actual external request URL without query string or fragment.
46. DPoP proof `ath` equals base64url(SHA-256(access_token)) for CDS API calls.
47. Device list uses `GET /v1/device`.
48. Add device uses `POST /v1/device` with JSON body.
49. Update device uses `PUT /v1/device` with JSON body.
50. Delete device uses `DELETE /v1/device/{serial}` with URL-encoded serial and no JSON body.
51. API base URL defaults to same-origin when `VITE_CDS_API_BASE_URL` is empty.
52. The UI handles `204 No Content` responses correctly.
53. The UI displays useful messages for 400, 401, 403, 404, 409, 413, 500, and network failures.
54. The UI shows an access denied state for 403 responses.
55. API/auth error UI uses fixed safe messages or escaped plain text only.

## Device Dashboard

56. The dashboard loads the device list on initial render after authentication.
57. The dashboard shows a loading state while devices are being fetched.
58. The dashboard shows an empty state when no devices exist.
59. The dashboard displays each device with `serial` and `controller_endpoint`.
60. The table supports refresh.
61. The table supports basic search/filter by serial or controller endpoint.
62. The table supports sorting by serial and controller endpoint.
63. The dashboard displays current auth mode and DPoP-ready state in a non-sensitive way.
64. The dashboard shows a `Last refresh` card instead of an API base URL card.
65. `Last refresh` displays `Never` before the first successful device list load.
66. `Last refresh` updates after initial successful list load, manual Refresh, and the successful list refresh following add, update, or delete.
67. Failed list requests do not update `Last refresh`.

## Add Device

68. The add form contains required fields for `serial` and `controller_endpoint`.
69. The form prevents submission when required fields are empty.
70. Inputs are trimmed before submit.
71. Serial is lower-cased before submit.
72. `controller_endpoint` must be a hostname/cloud endpoint only, such as `openwifi3.routerarchitects.com`.
73. `controller_endpoint` must be at most 253 characters.
74. `controller_endpoint` rejects port, scheme, path, query, fragment, and credentials.
75. On successful add, the UI shows a success message.
76. On successful add, the device list refreshes.
77. On successful add, the form resets.
78. A 409 conflict shows a clear owner/conflict message.

## Update Device

79. Clicking Edit fills the form with the selected device.
80. In edit mode, the primary button says `Update Device`.
81. In edit mode, the user can cancel and return to create mode.
82. On successful update, the UI shows a success message.
83. On successful update, the device list refreshes.
84. On successful update, the form returns to create mode.
85. A 404 during update shows a device-not-found message.

## Delete Device

86. Clicking Delete opens a confirmation dialog.
87. The dialog includes the selected device serial.
88. The delete request is not sent until the user confirms.
89. Delete uses `DELETE /v1/device/{serial}` and URL-encodes the serial.
90. Delete sends no JSON body.
91. On successful delete, the dialog closes.
92. On successful delete, the UI shows a success message.
93. On successful delete, the device list refreshes.
94. On delete failure, the UI shows an error message.

## Configuration

95. Frontend configuration is read from Vite environment variables.
96. The generated app includes a `.env.example` with required frontend values.
97. The generated app includes README setup instructions.
98. The app supports local development with Vite.
99. The app supports same-origin deployment behind Nginx.
100. The app does not require backend client secrets.
101. The app does not require CORS in the final Nginx deployment.
102. Mock mode never calls real CDS APIs and uses mocked responses only.
103. If `VITE_AUTH_MODE=mock` is used outside localhost/dev builds, app startup fails closed.

## Code Quality and Security

104. Code is written in TypeScript.
105. Device and API types are defined clearly.
106. Keycloak/OIDC auth logic is isolated from CRUD UI components.
107. DPoP crypto/proof logic is isolated in a dedicated module.
108. API calls are centralized in a client module.
109. Components are modular and reusable.
110. The app can be built with `npm run build`.
111. The app can be run locally with `npm run dev`.
112. The generated code includes clear error handling.
113. The generated code includes accessible labels for form inputs.
114. The generated UI is clean, responsive, and usable on laptop/desktop screens.
115. The app does not log raw access tokens, refresh tokens, or DPoP proofs.
116. The app does not store access tokens, refresh tokens, or DPoP private keys in long-lived `localStorage`.
117. The app does not use `dangerouslySetInnerHTML` for auth/API/server-driven messages.
118. The app never renders API/auth error payloads as HTML.
119. Production CSP includes at minimum `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and `connect-src 'self'`.
120. If Keycloak is on a separate origin, CSP `connect-src` allows only the configured Keycloak issuer origin in addition to `'self'`; it does not use wildcard origins.
