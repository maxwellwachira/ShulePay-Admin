import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';
import { SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { IconStaff, IconRefresh } from '@renderer/components/icons';

const MIN_PASSWORD = 10;

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
    mutationFn: () => api.createUser(orgId, { name: name.trim(), phone: phone.trim(), password, role }),
    onSuccess: (u) => {
      toast.push('ok', `${u.name} added as ${u.role}`);
      setName('');
      setPhone('');
      setPassword('');
      void qc.invalidateQueries({ queryKey: ['staff', orgId] });
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Could not add staff'),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    create.mutate();
  }

  const passwordShort = password.length > 0 && password.length < MIN_PASSWORD;

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Add staff</h2>
          <p>Colleagues sign in to this console with their phone and password.</p>
        </div>
        <div className="card-body">
          <form className="form-grid cols" onSubmit={submit}>
            <div className="field">
              <label htmlFor="st-name">Full name</label>
              <input
                id="st-name"
                className="input"
                placeholder="Jane Deputy"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="st-phone">Phone</label>
              <input
                id="st-phone"
                className="input"
                placeholder="254712345678"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="st-pass">Temporary password</label>
              <input
                id="st-pass"
                className={`input ${passwordShort ? 'invalid' : ''}`}
                type="password"
                placeholder={`At least ${MIN_PASSWORD} characters`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordShort ? (
                <span className="field-error">
                  {MIN_PASSWORD - password.length} more character{MIN_PASSWORD - password.length === 1 ? '' : 's'} needed.
                </span>
              ) : (
                <span className="field-hint">They should change it after first sign-in.</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="st-role">Permission level</label>
              <select
                id="st-role"
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
              >
                <option value="admin">Admin: full access</option>
                <option value="cashier">Cashier: limited</option>
              </select>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={create.isPending || !name.trim() || !phone.trim() || password.length < MIN_PASSWORD}
              >
                {create.isPending ? 'Adding…' : 'Add staff member'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head row">
          <h2>Team</h2>
          <span className="spacer" />
          <button className="icon-btn" onClick={() => void q.refetch()} aria-label="Refresh" title="Refresh">
            <IconRefresh className="ic" />
          </button>
        </div>
        {q.isLoading ? (
          <SkeletonRows rows={3} />
        ) : q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : (q.data?.users.length ?? 0) === 0 ? (
          <EmptyState icon={IconStaff} title="No staff yet" hint="Add your first colleague above." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.users.map((u) => (
                  <tr key={u.id}>
                    <td className="strong">{u.name ?? '–'}</td>
                    <td className="mono">{u.phone}</td>
                    <td>
                      <span className={`badge kind ${u.role === 'admin' ? 'badge-brand' : 'badge-neutral'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="mono">
                      {new Date(u.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                    </td>
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
