import { useState, type FormEvent } from 'react';
import { IconTerminals } from '@renderer/components/icons';
import type { TerminalIdentity } from '@shared/bridge';

/**
 * Turning this machine into a till. One field, one button — the API key is minted,
 * stored and never shown, because there is nothing useful a person can do with it and
 * plenty they can do wrong. Registering here is exactly equivalent to registering on
 * the Terminals screen; this just skips the copy-paste.
 */
export function PairDevice({
  orgId,
  onPaired,
  onCancel,
}: {
  orgId: string;
  onPaired: (identity: TerminalIdentity) => void;
  onCancel: () => void;
}): JSX.Element {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onPaired(await window.shulepay.terminal.pair(orgId, label.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pair this device.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="till-pair">
      <div className="card till-pair-card">
        <div className="card-body">
          <div className="state-icon" aria-hidden="true">
            <IconTerminals className="ic" />
          </div>
          <h2>Set this device up as a till</h2>
          <p className="muted">
            Give it a name the school will recognise on reports and receipts. It stays
            paired until someone unpairs it — signing out at the end of a shift is fine.
          </p>

          <form onSubmit={(e) => void submit(e)} className="stack" style={{ marginTop: 20 }}>
            <div className="field">
              <label htmlFor="pair-label">Till name</label>
              <input
                id="pair-label"
                className="input"
                placeholder="e.g. Canteen Till 1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
              />
              <span className="field-hint">
                Something physical, like “Canteen Till 1” or “Tuck Shop”.
              </span>
            </div>
            {error && (
              <div className="notice notice-err" role="alert">
                {error}
              </div>
            )}
            <div className="row">
              <button className="btn btn-primary btn-lg" disabled={busy || !label.trim()}>
                {busy ? 'Pairing…' : 'Pair this device'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                Back to console
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
