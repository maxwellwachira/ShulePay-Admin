import { useState, type FormEvent } from 'react';
import { useAuth } from '@renderer/auth/useAuth';
import { ApiError } from '@renderer/api/client';
import { Logo } from '@renderer/components/Logo';
import { IconEye, IconEyeOff, IconFingerprint, IconShield, IconZap } from '@renderer/components/icons';

const SUPPORT_EMAIL = 'support@thumbpay.com';

export function Login({ onTestFingerprint }: { onTestFingerprint: () => void }): JSX.Element {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-pane">
        <div className="auth-card">
          <Logo size={44} />
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your school's ThumbPay console</p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                className="input"
                placeholder="254712345678"
                inputMode="tel"
                autoComplete="username"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="input-affix">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff className="ic" /> : <IconEye className="ic" />}
                  </button>
                </span>
              </div>
            </div>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy || !phone || !password}>
              {busy && <span className="spinner" aria-hidden="true" />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="auth-foot">
            Forgot your password?{' '}
            <a className="link" href={`mailto:${SUPPORT_EMAIL}`} target="_blank" rel="noreferrer">
              Contact us
            </a>
          </p>
          <p className="auth-foot">
            <button
              type="button"
              className="link"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={onTestFingerprint}
            >
              Test fingerprint reader
            </button>
          </p>
        </div>
        <p className="auth-legal">© 2026 ThumbPay · Secure school payments</p>
      </div>

      <div className="auth-brand" aria-hidden="true">
        <div className="auth-demo-card">
          <div className="demo-icon">
            <IconFingerprint className="ic" />
          </div>
          <div className="demo-meta">
            <div className="demo-title">Payment received</div>
            <div className="demo-sub">Grace N. · Canteen Till 1</div>
          </div>
          <div className="demo-right">
            <div className="demo-amount">KES 80.00</div>
            <div className="demo-time">Just now</div>
          </div>
        </div>

        <h2>Cashless payments for your school, one fingerprint at a time.</h2>
        <p>
          Onboard students, enroll fingerprints, and watch canteen payments settle in
          real time. No cash, no cards, no lost lunch money.
        </p>
        <div className="auth-points">
          <div className="auth-point">
            <IconFingerprint className="ic" /> Students pay with a fingerprint, so there's nothing to lose
          </div>
          <div className="auth-point">
            <IconZap className="ic" /> Every top-up and purchase visible the moment it happens
          </div>
          <div className="auth-point">
            <IconShield className="ic" /> Guardian consent and spending limits built in
          </div>
        </div>
      </div>
    </div>
  );
}
