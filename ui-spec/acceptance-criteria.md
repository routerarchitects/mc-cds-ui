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
11. Before every CDS API request, the app ensures the access token is valid and refreshes it if near expiry.
12. Refresh requests for DPoP-bound tokens include a fresh DPoP proof signed with the same key.
13. If token refresh fails, the app clears session state and redirects or prompts the user to log in again.
14. The logout button logs the user out through Keycloak when possible and clears local/session auth state.
15. The app displays a clear unsupported-browser error if required Web Crypto features are unavailable.

## API Integration

16. All CDS admin API calls use `Authorization: DPoP <Keycloak access token>`.
17. All CDS admin API calls include `DPoP: <fresh proof JWT>`.
18. A new DPoP proof is generated for every API request.
19. Every DPoP proof uses a fresh `jti`.
20. DPoP proof `htm` matches the actual HTTP method.
21. DPoP proof `htu` matches the actual external request URL without query string or fragment.
22. DPoP proof `ath` equals base64url(SHA-256(access_token)) for CDS API calls.
23. Device list uses `GET /v1/device`.
24. Add device uses `POST /v1/device` with JSON body.
25. Update device uses `PUT /v1/device` with JSON body.
26. Delete device uses `DELETE /v1/device/{serial}` with URL-encoded serial and no JSON body.
27. API base URL defaults to same-origin when `VITE_CDS_API_BASE_URL` is empty.
28. The UI handles `204 No Content` responses correctly.
29. The UI displays useful messages for 400, 401, 403, 404, 409, 413, 500, and network failures.
30. The UI shows an access denied state for 403 responses.

## Device Dashboard

31. The dashboard loads the device list on initial render after authentication.
32. The dashboard shows a loading state while devices are being fetched.
33. The dashboard shows an empty state when no devices exist.
34. The dashboard displays each device with `serial` and `controller_endpoint`.
35. The table supports refresh.
36. The table supports basic search/filter by serial or controller endpoint.
37. The table supports sorting by serial and controller endpoint.
38. The dashboard displays current auth mode and DPoP-ready state in a non-sensitive way.
39. The dashboard shows a `Last refresh` card instead of an API base URL card.
40. `Last refresh` displays `Never` before the first successful device list load.
41. `Last refresh` updates after initial successful list load, manual Refresh, and the successful list refresh following add, update, or delete.
42. Failed list requests do not update `Last refresh`.

## Add Device

43. The add form contains required fields for `serial` and `controller_endpoint`.
44. The form prevents submission when required fields are empty.
45. Inputs are trimmed before submit.
46. Serial is lower-cased before submit.
47. On successful add, the UI shows a success message.
48. On successful add, the device list refreshes.
49. On successful add, the form resets.
50. A 409 conflict shows a clear owner/conflict message.

## Update Device

51. Clicking Edit fills the form with the selected device.
52. In edit mode, the primary button says `Update Device`.
53. In edit mode, the user can cancel and return to create mode.
54. On successful update, the UI shows a success message.
55. On successful update, the device list refreshes.
56. On successful update, the form returns to create mode.
57. A 404 during update shows a device-not-found message.

## Delete Device

58. Clicking Delete opens a confirmation dialog.
59. The dialog includes the selected device serial.
60. The delete request is not sent until the user confirms.
61. Delete uses `DELETE /v1/device/{serial}` and URL-encodes the serial.
62. Delete sends no JSON body.
63. On successful delete, the dialog closes.
64. On successful delete, the UI shows a success message.
65. On successful delete, the device list refreshes.
66. On delete failure, the UI shows an error message.

## Configuration

67. Frontend configuration is read from Vite environment variables.
68. The generated app includes a `.env.example` with required frontend values.
69. The generated app includes README setup instructions.
70. The app supports local development with Vite.
71. The app supports same-origin deployment behind Nginx.
72. The app does not require backend client secrets.
73. The app does not require CORS in the final Nginx deployment.

## Code Quality and Security

74. Code is written in TypeScript.
75. Device and API types are defined clearly.
76. Keycloak/OIDC auth logic is isolated from CRUD UI components.
77. DPoP crypto/proof logic is isolated in a dedicated module.
78. API calls are centralized in a client module.
79. Components are modular and reusable.
80. The app can be built with `npm run build`.
81. The app can be run locally with `npm run dev`.
82. The generated code includes clear error handling.
83. The generated code includes accessible labels for form inputs.
84. The generated UI is clean, responsive, and usable on laptop/desktop screens.
85. The app does not log raw access tokens, refresh tokens, or DPoP proofs.
86. The app does not store access tokens, refresh tokens, or DPoP private keys in long-lived `localStorage`.
