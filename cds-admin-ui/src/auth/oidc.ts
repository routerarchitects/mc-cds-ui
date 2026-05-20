import { createDpopProof, generateExportableDpopKeyPair, importRuntimeDpopKeyPair, jwkThumbprint, type ExportedDpopKeyPair, type RuntimeDpopKeyPair } from '../crypto/dpop';
import { randomBase64url } from '../crypto/base64url';
import { createPkcePair } from '../crypto/pkce';
import { buildAbsoluteSameOriginUrl, getConfig } from '../utils/config';
import { getAccessTokenExpiry, userFromClaims, validateIdToken } from './jwt';
import type { AuthTransaction, OidcDiscovery, TokenSet, UserInfo } from './types';

const TX_KEY = 'cds_admin_auth_tx';
const DPOP_KEY = 'cds_admin_dpop_jwk';

export async function discoverIssuer(issuer: string): Promise<OidcDiscovery> {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error('Unable to load Keycloak discovery document.');
  }
  const discovery = (await response.json()) as OidcDiscovery;
  if (!discovery.authorization_endpoint || !discovery.token_endpoint || !discovery.jwks_uri) {
    throw new Error('Keycloak discovery document is missing required endpoints.');
  }
  return discovery;
}

function saveTransaction(tx: AuthTransaction): void {
  sessionStorage.setItem(TX_KEY, JSON.stringify(tx));
}

function loadTransaction(): AuthTransaction {
  const raw = sessionStorage.getItem(TX_KEY);
  if (!raw) throw new Error('Missing OAuth transaction state.');
  return JSON.parse(raw) as AuthTransaction;
}

export function clearAuthTransaction(): void {
  sessionStorage.removeItem(TX_KEY);
}

function saveRedirectDpopKey(exported: ExportedDpopKeyPair): void {
  sessionStorage.setItem(DPOP_KEY, JSON.stringify(exported));
}

function restoreAndClearRedirectDpopKey(): ExportedDpopKeyPair {
  const raw = sessionStorage.getItem(DPOP_KEY);
  sessionStorage.removeItem(DPOP_KEY);
  if (!raw) throw new Error('Missing redirect DPoP key material.');
  return JSON.parse(raw) as ExportedDpopKeyPair;
}

export function clearRedirectDpopKey(): void {
  sessionStorage.removeItem(DPOP_KEY);
}

function assertNoDuplicateParams(params: URLSearchParams): void {
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (seen.has(key)) throw new Error(`Duplicate callback parameter: ${key}`);
    seen.add(key);
  }
}

function getDpopNonce(response: Response, payload?: unknown): string | undefined {
  const header = response.headers.get('DPoP-Nonce') || response.headers.get('dpop-nonce');
  if (header) return header;
  if (payload && typeof payload === 'object' && 'dpop_nonce' in payload && typeof (payload as { dpop_nonce?: unknown }).dpop_nonce === 'string') {
    return (payload as { dpop_nonce: string }).dpop_nonce;
  }
  return undefined;
}

async function tokenRequestWithDpop(discovery: OidcDiscovery, dpop: RuntimeDpopKeyPair, body: URLSearchParams, nonce?: string, retry = true): Promise<Record<string, unknown>> {
  const proof = await createDpopProof(dpop, { method: 'POST', url: discovery.token_endpoint, nonce });
  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      DPoP: proof
    },
    body,
    credentials: 'omit'
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    const returnedNonce = getDpopNonce(response, payload);
    if (retry && returnedNonce) {
      return tokenRequestWithDpop(discovery, dpop, body, returnedNonce, false);
    }
    throw new Error('Keycloak token request failed.');
  }
  return payload as Record<string, unknown>;
}

function parseTokens(payload: Record<string, unknown>): TokenSet {
  if (typeof payload.access_token !== 'string') throw new Error('Token response is missing access_token.');
  if (typeof payload.id_token !== 'string') throw new Error('Token response is missing required ID token.');
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
    idToken: payload.id_token,
    expiresAt: getAccessTokenExpiry(payload.access_token)
  };
}

export async function beginLogin(): Promise<void> {
  const config = getConfig();
  const discovery = await discoverIssuer(config.keycloakIssuer);
  const { verifier, challenge } = await createPkcePair();
  const state = randomBase64url(32);
  const nonce = randomBase64url(32);
  const exportedDpop = await generateExportableDpopKeyPair();
  const dpopJkt = await jwkThumbprint(exportedDpop.publicJwk);

  const tx: AuthTransaction = {
    state,
    nonce,
    codeVerifier: verifier,
    redirectPath: config.redirectPath
  };
  saveTransaction(tx);
  saveRedirectDpopKey(exportedDpop);

  const authorizationUrl = new URL(discovery.authorization_endpoint);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', config.keycloakClientId);
  authorizationUrl.searchParams.set('redirect_uri', buildAbsoluteSameOriginUrl(config.redirectPath));
  authorizationUrl.searchParams.set('scope', config.keycloakScope);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('nonce', nonce);
  authorizationUrl.searchParams.set('code_challenge', challenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('dpop_jkt', dpopJkt);

  window.location.assign(authorizationUrl.toString());
}

export async function handleCallback(): Promise<{ tokens: TokenSet; dpop: RuntimeDpopKeyPair; discovery: OidcDiscovery; user: UserInfo }> {
  const config = getConfig();
  try {
    const params = new URLSearchParams(window.location.search);
    assertNoDuplicateParams(params);
    const code = params.get('code');
    const returnedState = params.get('state');
    if (!code || !returnedState) throw new Error('OAuth callback is missing required code or state.');

    const tx = loadTransaction();
    if (tx.state !== returnedState) throw new Error('OAuth state validation failed.');

    const exportedDpop = restoreAndClearRedirectDpopKey();
    const dpop = await importRuntimeDpopKeyPair(exportedDpop);
    const discovery = await discoverIssuer(config.keycloakIssuer);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: buildAbsoluteSameOriginUrl(config.redirectPath),
      client_id: config.keycloakClientId,
      code_verifier: tx.codeVerifier
    });

    const payload = await tokenRequestWithDpop(discovery, dpop, body);
    const tokens = parseTokens(payload);
    const claims = await validateIdToken(tokens.idToken, {
      issuer: config.keycloakIssuer,
      clientId: config.keycloakClientId,
      nonce: tx.nonce,
      jwksUri: discovery.jwks_uri
    });
    const user = userFromClaims(claims);
    clearAuthTransaction();
    clearRedirectDpopKey();
    window.history.replaceState({}, document.title, window.location.origin + '/');
    return { tokens, dpop, discovery, user };
  } catch (error) {
    clearAuthTransaction();
    clearRedirectDpopKey();
    throw error;
  }
}

export async function refreshTokens(
  discovery: OidcDiscovery,
  dpop: RuntimeDpopKeyPair,
  refreshToken: string
): Promise<{ tokens: TokenSet; user: UserInfo }> {
  const config = getConfig();
  const payload = await tokenRequestWithDpop(
    discovery,
    dpop,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.keycloakClientId
    })
  );
  const tokens = parseTokens(payload);
  const claims = await validateIdToken(tokens.idToken, {
    issuer: config.keycloakIssuer,
    clientId: config.keycloakClientId,
    jwksUri: discovery.jwks_uri
  });
  return { tokens, user: userFromClaims(claims) };
}

export async function keycloakLogout(discovery: OidcDiscovery, dpop: RuntimeDpopKeyPair, tokens: TokenSet): Promise<void> {
  const config = getConfig();
  if (!discovery.end_session_endpoint) return;
  const endpoint = discovery.end_session_endpoint;
  const body = new URLSearchParams({
    client_id: config.keycloakClientId,
    id_token_hint: tokens.idToken,
    post_logout_redirect_uri: buildAbsoluteSameOriginUrl(config.postLogoutPath)
  });
  const doRequest = async (nonce?: string): Promise<Response> => {
    const proof = await createDpopProof(dpop, { method: 'POST', url: endpoint, nonce });
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', DPoP: proof },
      body,
      credentials: 'omit'
    });
  };
  const response = await doRequest();
  if (!response.ok) {
    const nonce = getDpopNonce(response);
    if (nonce) await doRequest(nonce);
  }
}
