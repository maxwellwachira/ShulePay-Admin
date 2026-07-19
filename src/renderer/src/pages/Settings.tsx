import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@renderer/auth/useAuth';

export function Settings(): JSX.Element {
  const { me, logout } = useAuth();
  const config = useQuery({ queryKey: ['appConfig'], queryFn: () => window.shulepay.app.getConfig() });

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>School</h2>
        </div>
        <div className="card-body">
          <dl className="kv">
            <dt>Name</dt>
            <dd>{me?.org?.name ?? '–'}</dd>
            <dt>School ID</dt>
            <dd className="mono">{me?.orgId ?? '–'}</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Your account</h2>
        </div>
        <div className="card-body">
          <dl className="kv">
            <dt>Name</dt>
            <dd>{me?.name ?? '–'}</dd>
            <dt>Phone</dt>
            <dd className="mono">{me?.phone}</dd>
            <dt>Role</dt>
            <dd className="kind">{me?.role}</dd>
          </dl>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn btn-secondary" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>About this app</h2>
          <p>Details support may ask for when helping you.</p>
        </div>
        <div className="card-body">
          <dl className="kv">
            <dt>Server</dt>
            <dd className="mono">{config.data?.apiBaseUrl ?? '–'}</dd>
            <dt>Security</dt>
            <dd>Your sign-in token is encrypted with this computer's OS keychain.</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
