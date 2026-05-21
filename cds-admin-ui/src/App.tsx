import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AppLayout } from './components/AppLayout';
import { LoadingState } from './components/LoadingState';
import { DeviceDashboard } from './pages/DeviceDashboard';
import './styles.css';

function AuthGate() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="center-page">
        <LoadingState label="Preparing authentication..." />
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="center-page">
        <div className="card auth-card">
          <h1>Authentication error</h1>
          <p>{auth.error}</p>
          <button type="button" className="button button-primary" onClick={() => void auth.login()}>
            Try login again
          </button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="center-page">
        <div className="card auth-card">
          <p className="eyebrow">Controller Discovery Service</p>
          <h1>CDS Admin UI</h1>
          <p>Sign in with Keycloak to manage device serials and controller endpoint mappings.</p>
          <button type="button" className="button button-primary" onClick={() => void auth.login()}>
            Sign in with Keycloak
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <DeviceDashboard />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
