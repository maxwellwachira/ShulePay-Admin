import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';
import { SkeletonRows, ErrorState, EmptyState, CopyButton } from '@renderer/components/ui';
import { IconTerminals, IconAlert, IconRefresh } from '@renderer/components/icons';

export function Terminals({ orgId }: { orgId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['terminals', orgId], queryFn: () => api.listTerminals(orgId) });
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState<{ label: string; apiKey: string } | null>(null);

  const register = useMutation({
    mutationFn: () => api.registerTerminal(orgId, label.trim()),
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
          <p>Each till or canteen device gets its own key. The key is shown once, so copy it right away.</p>
        </div>
        <div className="card-body">
          <form className="row" onSubmit={submit} style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="term-label">Terminal label</label>
              <input
                id="term-label"
                className="input"
                placeholder="e.g. Canteen Till 1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" disabled={register.isPending || !label.trim()}>
              {register.isPending ? 'Registering…' : 'Register'}
            </button>
          </form>

          {newKey && (
            <div className="keybox" role="alert">
              <div className="keybox-title">
                <IconAlert className="ic" /> API key for “{newKey.label}”
              </div>
              <p>
                Store this on the device now. For security it can never be shown again; if it's
                lost, register the terminal afresh.
              </p>
              <div className="keybox-code">
                <code>{newKey.apiKey}</code>
                <CopyButton text={newKey.apiKey} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setNewKey(null)}>
                  I've stored it, dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head row">
          <h2>Terminals</h2>
          <span className="spacer" />
          <button className="icon-btn" onClick={() => void q.refetch()} aria-label="Refresh" title="Refresh">
            <IconRefresh className="ic" />
          </button>
        </div>
        {q.isLoading ? (
          <SkeletonRows rows={3} />
        ) : q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : (q.data?.terminals.length ?? 0) === 0 ? (
          <EmptyState
            icon={IconTerminals}
            title="No terminals yet"
            hint="Register your first till above. The canteen is a great place to start."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.terminals.map((t) => (
                  <tr key={t.id}>
                    <td className="strong">{t.label}</td>
                    <td>
                      <span className={`dot ${t.status === 'active' ? 'dot-active' : 'dot-idle'}`} />{' '}
                      <span className="kind">{t.status}</span>
                    </td>
                    <td className="mono">
                      {new Date(t.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
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
