import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';

export function Terminals({ orgId }: { orgId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['terminals', orgId], queryFn: () => api.listTerminals(orgId) });
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState<{ label: string; apiKey: string } | null>(null);

  const register = useMutation({
    mutationFn: () => api.registerTerminal(orgId, label),
    onSuccess: (t) => {
      setNewKey({ label: t.label, apiKey: t.apiKey });
      setLabel('');
      toast.push('ok', `Terminal “${t.label}” registered`);
      void qc.invalidateQueries({ queryKey: ['terminals', orgId] });
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Could not register terminal'),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    register.mutate();
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Register a POS terminal</h2>
          <p>Each till/canteen device gets its own key. The key is shown once — copy it now.</p>
        </div>
        <div className="card-body">
          <form className="row" onSubmit={submit} style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Terminal label</label>
              <input className="input" placeholder="e.g. Canteen Till 1" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <button className="btn btn-primary" disabled={register.isPending || !label}>
              {register.isPending ? 'Registering…' : 'Register'}
            </button>
          </form>
          {newKey && (
            <div className="keybox">
              <strong>API key for “{newKey.label}”</strong> — store it on the device now; it can't be shown again.
              <code>{newKey.apiKey}</code>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Terminals</h2>
        </div>
        {q.isLoading ? (
          <div className="empty">Loading…</div>
        ) : (q.data?.terminals.length ?? 0) === 0 ? (
          <div className="empty">No terminals registered yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Label</th><th>Status</th><th>Registered</th></tr>
              </thead>
              <tbody>
                {q.data?.terminals.map((t) => (
                  <tr key={t.id}>
                    <td className="strong">{t.label}</td>
                    <td>
                      <span className={`dot ${t.status === 'active' ? 'dot-active' : 'dot-idle'}`} />{' '}
                      <span className="kind">{t.status}</span>
                    </td>
                    <td className="mono">{new Date(t.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</td>
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
