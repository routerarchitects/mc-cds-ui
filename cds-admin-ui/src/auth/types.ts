import type { RuntimeDpopKeyPair } from '../crypto/dpop';

export interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  issuer: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresAt: number;
}

export interface UserInfo {
  subject?: string;
  name?: string;
  email?: string;
  preferredUsername?: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDpopReady: boolean;
  authMode: 'keycloak-dpop' | 'mock';
  user?: UserInfo;
  error?: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  getDpopProof: (method: string, url: string, accessToken: string) => Promise<string>;
}

export interface AuthTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectPath: string;
}

export interface RuntimeSession {
  tokens: TokenSet;
  dpop: RuntimeDpopKeyPair;
  discovery: OidcDiscovery;
  user: UserInfo;
}
