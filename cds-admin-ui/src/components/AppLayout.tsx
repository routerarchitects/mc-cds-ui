import { useAuth } from '../auth/useAuth';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-svg">
      <path d="M12 3.5 5.5 6v5.2c0 4.4 2.7 8.4 6.5 9.8 3.8-1.4 6.5-5.4 6.5-9.8V6L12 3.5Zm0 2.1 4.8 1.8v3.8c0 3.4-2 6.6-4.8 7.9-2.8-1.3-4.8-4.5-4.8-7.9V7.4L12 5.6Z" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-svg button-icon-svg">
      <path d="M10 4H6.8A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.8 20H10v-1.8H6.8V5.8H10V4Zm5.2 4.2-1.3 1.3 1.8 1.8H9v1.8h6.7l-1.8 1.8 1.3 1.3 4-4-4-4Z" fill="currentColor" />
    </svg>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const displayName = auth.user?.preferredUsername || auth.user?.name || auth.user?.email || 'CDS Admin';
  const authBadgeLabel = auth.authMode === 'mock' ? 'Mock auth' : 'Keycloak DPoP';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <ShieldIcon />
          </div>
          <div>
            <h1>CDS Admin</h1>
            <p>Device controller mappings</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="auth-badge">{authBadgeLabel}</span>
          <div className="header-user">{displayName}</div>
          <button type="button" className="button button-secondary header-logout" onClick={() => void auth.logout()}>
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
