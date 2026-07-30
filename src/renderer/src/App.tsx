import { useState } from 'react';
import { useAuth } from '@renderer/auth/useAuth';
import { Login } from '@renderer/pages/Login';
import { Console } from '@renderer/pages/Console';
import { FingerprintTest } from '@renderer/pages/FingerprintTest';

export function App(): JSX.Element {
  const { me, loading } = useAuth();
  const [testingFingerprint, setTestingFingerprint] = useState(false);

  if (testingFingerprint) {
    return <FingerprintTest onBack={() => setTestingFingerprint(false)} />;
  }
  if (loading) {
    return (
      <div className="auth">
        <span className="muted">Loading…</span>
      </div>
    );
  }
  return me ? <Console /> : <Login onTestFingerprint={() => setTestingFingerprint(true)} />;
}
