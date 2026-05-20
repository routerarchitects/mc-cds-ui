export type AuthMode = 'keycloak-dpop' | 'mock';

export interface AppConfig {
  authMode: AuthMode;
  keycloakIssuer: string;
  keycloakClientId: string;
  keycloakScope: string;
  cdsApiBaseUrl: string;
  redirectPath: string;
  postLogoutPath: string;
}

function env(name: string): string | undefined {
  return import.meta.env[name] as string | undefined;
}

function requireRelativePath(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || /[\u0000-\u001F\u007F]/.test(candidate)) {
    throw new Error(`Invalid relative path config: ${candidate}`);
  }
  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      throw new Error('not same origin');
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    throw new Error(`Invalid relative path config: ${candidate}`);
  }
}

function validateMockMode(authMode: AuthMode): void {
  if (authMode !== 'mock') return;
  const isDev = import.meta.env.DEV;
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isDev || !isLocalhost) {
    throw new Error('Mock auth mode is allowed only on localhost during Vite development.');
  }
}

export function getConfig(): AppConfig {
  const authMode = (env('VITE_AUTH_MODE') || 'keycloak-dpop') as AuthMode;
  if (authMode !== 'keycloak-dpop' && authMode !== 'mock') {
    throw new Error(`Unsupported VITE_AUTH_MODE: ${authMode}`);
  }
  validateMockMode(authMode);

  const issuer = (env('VITE_KEYCLOAK_ISSUER') || '').replace(/\/+$/, '');
  if (authMode === 'keycloak-dpop' && !issuer) {
    throw new Error('VITE_KEYCLOAK_ISSUER is required for keycloak-dpop mode.');
  }

  return {
    authMode,
    keycloakIssuer: issuer,
    keycloakClientId: env('VITE_KEYCLOAK_CLIENT_ID') || 'cds-admin-ui',
    keycloakScope: env('VITE_KEYCLOAK_SCOPE') || 'openid profile email',
    cdsApiBaseUrl: (env('VITE_CDS_API_BASE_URL') || '').replace(/\/+$/, ''),
    redirectPath: requireRelativePath(env('VITE_KEYCLOAK_REDIRECT_PATH'), '/callback'),
    postLogoutPath: requireRelativePath(env('VITE_KEYCLOAK_POST_LOGOUT_PATH'), '/')
  };
}

export function buildAbsoluteSameOriginUrl(relativePath: string): string {
  const url = new URL(requireRelativePath(relativePath, '/'), window.location.origin);
  return url.toString();
}
