# CDS Admin UI Acceptance Criteria

## Authentication and DPoP

1. Opening the Admin UI while unauthenticated redirects the user to Keycloak login.
2. After successful Keycloak login, the user returns to the Admin UI.
3. After login, the Device Dashboard is displayed automatically.
4. The Admin UI uses Authorization Code Flow with PKCE S256.
5. No Keycloak client secret exists in frontend code, frontend `.env`, browser storage, or generated bundle.
6. The app generates an ES256 / P-256 DPoP key pair in the browser.
7. The app obtains a DPoP-bound Keycloak access token containing `cnf.jkt`.
8. The token request to Keycloak includes a DPoP proof when DPoP-bound tokens are required.
9. If strict Keycloak DPoP policy requires `dpop_jkt`, the authorization request includes it.
10. The app uses the same DPoP key for token request, refresh, logout when required, and CDS API calls in the same session.
11. The app preserves the same DPoP key across the authorization redirect and callback.
12. The app does not generate a different DPoP key for the token request than the key used to compute `dpop_jkt`.
13. If redirect-safe storage is needed, the app stores DPoP key material only in `sessionStorage`.
14. The app clears session-scoped DPoP key material on logout, auth failure, refresh failure, or a new login flow.
15. The app does not store the DPoP private key in `localStorage`.
16. Before every CDS API request, the app ensures the access token is valid and refreshes it if near expiry.
17. Refresh requests for DPoP-bound tokens include a fresh DPoP proof signed with the same key.
18. Token requests handle DPoP nonce challenges by retrying once with the returned nonce.
19. Refresh requests handle DPoP nonce challenges by retrying once with the returned nonce.
20. Logout requests handle DPoP nonce challenges when Keycloak requires DPoP for logout.
21. DPoP nonce retry logic does not loop indefinitely.
22. If nonce retry fails, the app clears unsafe auth state and shows a clear auth error or requires login again.
23. If token refresh fails, the app clears session state and redirects or prompts the user to log in again.
24. The logout button logs the user out through Keycloak when possible and clears local/session auth state.
25. The app displays a clear unsupported-browser error if required Web Crypto features are unavailable.

## API Integration

26. All CDS admin API calls use `Authorization: DPoP <Keycloak access token>`.
27. All CDS admin API calls include `DPoP: <fresh proof JWT>`.
28. A new DPoP proof is generated for every API request.
29. Every DPoP proof uses a fresh `jti`.
30. DPoP proof `htm` matches the actual HTTP method.
31. DPoP proof `htu` matches the actual external request URL without query string or fragment.
32. DPoP proof `ath` equals base64url(SHA-256(access_token)) for CDS API calls.
33. Device list uses `GET /v1/device`.
34. Add device uses `POST /v1/device` with JSON body.
35. Update device uses `PUT /v1/device` with JSON body.
36. Delete device uses `DELETE /v1/device/{serial}` with URL-encoded serial and no JSON body.
37. API base URL defaults to same-origin when `VITE_CDS_API_BASE_URL` is empty.
38. The UI handles `204 No Content` responses correctly.
39. The UI displays useful messages for 400, 401, 403, 404, 409, 413, 500, and network failures.
40. The UI shows an access denied state for 403 responses.

## Device Dashboard

41. The dashboard loads the device list on initial render after authentication.
42. The dashboard shows a loading state while devices are being fetched.
43. The dashboard shows an empty state when no devices exist.
44. The dashboard displays each device with `serial` and `controller_endpoint`.
45. The table supports refresh.
46. The table supports basic search/filter by serial or controller endpoint.
47. The table supports sorting by serial and controller endpoint.
48. The dashboard displays current auth mode and DPoP-ready state in a non-sensitive way.
49. The dashboard shows a `Last refresh` card instead of an API base URL card.
50. `Last refresh` displays `Never` before the first successful device list load.
51. `Last refresh` updates after initial successful list load, manual Refresh, and the successful list refresh following add, update, or delete.
52. Failed list requests do not update `Last refresh`.

## Add Device

53. The add form contains required fields for `serial` and `controller_endpoint`.
54. The form prevents submission when required fields are empty.
55. Inputs are trimmed before submit.
56. Serial is lower-cased before submit.
57. On successful add, the UI shows a success message.
58. On successful add, the device list refreshes.
59. On successful add, the form resets.
60. A 409 conflict shows a clear owner/conflict message.

## Update Device

61. Clicking Edit fills the form with the selected device.
62. In edit mode, the primary button says `Update Device`.
63. In edit mode, the user can cancel and return to create mode.
64. On successful update, the UI shows a success message.
65. On successful update, the device list refreshes.
66. On successful update, the form returns to create mode.
67. A 404 during update shows a device-not-found message.

## Delete Device

68. Clicking Delete opens a confirmation dialog.
69. The dialog includes the selected device serial.
70. The delete request is not sent until the user confirms.
71. Delete uses `DELETE /v1/device/{serial}` and URL-encodes the serial.
72. Delete sends no JSON body.
73. On successful delete, the dialog closes.
74. On successful delete, the UI shows a success message.
75. On successful delete, the device list refreshes.
76. On delete failure, the UI shows an error message.

## Configuration

77. Frontend configuration is read from Vite environment variables.
78. The generated app includes a `.env.example` with required frontend values.
79. The generated app includes README setup instructions.
80. The app supports local development with Vite.
81. The app supports same-origin deployment behind Nginx.
82. The app does not require backend client secrets.
83. The app does not require CORS in the final Nginx deployment.

## Code Quality and Security

84. Code is written in TypeScript.
85. Device and API types are defined clearly.
86. Keycloak/OIDC auth logic is isolated from CRUD UI components.
87. DPoP crypto/proof logic is isolated in a dedicated module.
88. API calls are centralized in a client module.
89. Components are modular and reusable.
90. The app can be built with `npm run build`.
91. The app can be run locally with `npm run dev`.
92. The generated code includes clear error handling.
93. The generated code includes accessible labels for form inputs.
94. The generated UI is clean, responsive, and usable on laptop/desktop screens.
95. The app does not log raw access tokens, refresh tokens, or DPoP proofs.
96. The app does not store access tokens, refresh tokens, or DPoP private keys in long-lived `localStorage`.
