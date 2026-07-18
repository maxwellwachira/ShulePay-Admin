import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';

/** School staff: list existing users and add new admins/cashiers. Role is the
 * permission level (admin = full console, cashier = limited). */
export function Staff({ orgId }: { orgId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['staff', orgId], queryFn: () => api.listStaff(orgId) });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');

  const create = useMutation({
    mutationFn: () => api.createUser(orgId, { name, phone, password, role }),
    onSuccess: (u) => {
      toast.push('ok', `${u.name} added as ${u.role}`);
      setName(''); setPhone(''); setPassword('');
      void qc.invalidateQueries({ queryKey: ['staff', orgId] });
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Could not add staff'),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    create.mutate();
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Add staff</h2>
          <p>Colleagues sign in with their phone + password.</p>
        </div>
        <div className="card-body">
          <form className="form-grid" onSubmit={submit}>
            <div className="field"><label>Full name</label>
              <input className="input" placeholder="Jane Deputy" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Phone</label>
              <input className="input" placeholder="2547…" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="field"><label>Temporary password</label>
              <input className="input" type="password" placeholder="at least 10 characters" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="field"><label>Permission level</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}>
                <option value="admin">Admin — full access</option>
                <option value="cashier">Cashier — limited</option>
              </select></div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={create.isPending || !name || !phone || password.length < 10}>
                {create.isPending ? 'Adding…' : 'Add staff member'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Team</h2></div>
        {q.isLoading ? (
          <div className="empty">Loading…</div>
        ) : (q.data?.users.length ?? 0) === 0 ? (
          <div className="empty">No staff yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Phone</th><th>Role</th></tr></thead>
              <tbody>
                {q.data?.users.map((u) => (
                  <tr key={u.id}>
                    <td className="strong">{u.name ?? '—'}</td>
                    <td className="mono">{u.phone}</td>
                    <td><span className="badge badge-ok kind">{u.role}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
