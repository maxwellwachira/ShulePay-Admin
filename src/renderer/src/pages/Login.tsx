import { useState, type FormEvent } from 'react';
import { useAuth } from '@renderer/auth/useAuth';
import { ApiError } from '@renderer/api/client';

export function Login(): JSX.Element {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(phone, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={onSubmit}>
        <h1>ShulePay Admin</h1>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy || !phone || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
