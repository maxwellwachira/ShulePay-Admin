import { useAuth } from '@renderer/auth/useAuth';
import { Login } from '@renderer/pages/Login';
import { Dashboard } from '@renderer/pages/Dashboard';

export function App(): JSX.Element {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth">
        <span className="muted">Loading…</span>
      </div>
    );
  }
  return user ? <Dashboard /> : <Login />;
}
