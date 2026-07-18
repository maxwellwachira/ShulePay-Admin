import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';

/** Create staff for the school. Role is the permission level (admin = full console,
 * cashier = limited). Granular per-action permissions can layer on later. */
export function Staff({ orgId }: { orgId: string }): JSX.Element {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const create = useMutation({
    mutationFn: () => api.createUser(orgId, { name, phone, password, role }),
    onSuccess: (u) => {
      setNotice({ kind: 'ok', text: `${u.name} added as ${u.role}.` });
      setName(''); setPhone(''); setPassword('');
    },
    onError: (e) => setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not add user' }),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    create.mutate();
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Add staff</h2>
        <p>Give colleagues access to this school's console. They sign in with phone + password.</p>
      </div>
      <div className="card-body">
        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label>Full name</label>
            <input className="input" placeholder="Jane Deputy" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" placeholder="2547…" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <input className="input" type="password" placeholder="at least 10 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Permission level</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}>
              <option value="admin">Admin — full access</option>
              <option value="cashier">Cashier — limited</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={create.isPending || !name || !phone || password.length < 10}>
              {create.isPending ? 'Adding…' : 'Add staff member'}
            </button>
          </div>
        </form>
        {notice && <div className={`notice notice-${notice.kind === 'ok' ? 'ok' : 'err'}`}>{notice.text}</div>}
      </div>
    </div>
  );
}
