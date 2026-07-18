import { useAuth } from '@renderer/auth/useAuth';
import { Login } from '@renderer/pages/Login';
import { Console } from '@renderer/pages/Console';

export function App(): JSX.Element {
  const { me, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth">
        <span className="muted">Loading…</span>
      </div>
    );
  }
  return me ? <Console /> : <Login />;
}
