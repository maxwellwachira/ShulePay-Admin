import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatKes, ApiError, type MemberTxn } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';
import { SkeletonRows, ErrorState } from '@renderer/components/ui';
import {
  IconStudents,
  IconFingerprint,
  IconReceipt,
  IconRefresh,
  IconCheck,
} from '@renderer/components/icons';
import { normalizePhone, formatPhone } from '@renderer/lib/phone';

/** How long we keep watching for the M-Pesa callback before giving up on the wait. */
const TOPUP_WATCH_MS = 120_000;

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function StudentPage({
  memberId,
  onBack,
}: {
  memberId: string;
  onBack: () => void;
}): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();

  // A sent top-up settles asynchronously (the payer enters their PIN, then M-Pesa calls
  // the backend). While one is outstanding we poll so the new balance lands on its own.
  const [pending, setPending] = useState<{ phone: string; balanceBefore: number } | null>(null);

  const q = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => api.memberDetail(memberId),
    ...(pending ? { refetchInterval: 4000 } : {}),
  });
  const txns = useQuery({
    queryKey: ['member-txns', memberId],
    queryFn: () => api.memberTransactions(memberId),
    ...(pending ? { refetchInterval: 4000 } : {}),
  });
  const fingers = useQuery({
    queryKey: ['member-fingers', memberId],
    queryFn: () => api.memberFingers(memberId),
  });

  const d = q.data;
  const guardians = d?.guardians ?? [];
  const rows = txns.data?.transactions ?? [];
  const spentThisMonth = rows
    .filter((t) => t.amountCents < 0 && isThisMonth(t.createdAt))
    .reduce((s, t) => s + -t.amountCents, 0);
  const lastTopup = rows.find((t) => t.amountCents > 0);

  // Stop watching once the wallet goes UP (the callback credited it) — or after a while,
  // since a payer who never enters their PIN would otherwise leave us polling forever.
  const balanceCents = d?.balanceCents;
  const push = toast.push;
  useEffect(() => {
    if (!pending) return undefined;
    if (balanceCents !== undefined && balanceCents > pending.balanceBefore) {
      setPending(null);
      push('ok', `Top-up received — balance is now ${formatKes(balanceCents)}`);
      return undefined;
    }
    const id = window.setTimeout(() => setPending(null), TOPUP_WATCH_MS);
    return () => window.clearTimeout(id);
  }, [pending, balanceCents, push]);

  function refreshAll(): void {
    void q.refetch();
    void txns.refetch();
  }

  return (
    <div className="stack">
      <div className="crumb">
        <button className="link-btn" onClick={onBack}>
          ← Students
        </button>
      </div>

      {q.isLoading ? (
        <div className="card">
          <SkeletonRows rows={6} />
        </div>
      ) : q.isError || !d ? (
        <div className="card">
          <ErrorState onRetry={() => void q.refetch()} />
        </div>
      ) : (
        <>
          <div className="card profile-head">
            <div className="profile-avatar">{initials(d.name)}</div>
            <div className="profile-id">
              <h2>{d.name}</h2>
              <p>
                <span className="mono">{d.accountNumber}</span>
                {' · '}
                {guardians.length} guardian{guardians.length === 1 ? '' : 's'}
              </p>
            </div>
            <span className="spacer" />
            <span className={`badge kind ${d.status === 'active' ? 'badge-ok' : 'badge-neutral'}`}>
              {d.status}
            </span>
            <button className="icon-btn" onClick={refreshAll} aria-label="Refresh" title="Refresh">
              <IconRefresh className="ic" />
            </button>
          </div>

          <div className="stat-row">
            <div className="stat">
              <div className="stat-label">
                <IconStudents className="ic" /> Wallet balance
              </div>
              <div className="stat-value">{formatKes(d.balanceCents)}</div>
              <div className="stat-sub">
                {pending ? `waiting on ${formatPhone(pending.phone)}` : 'available to spend'}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">
                <IconReceipt className="ic" /> Spent this month
              </div>
              <div className="stat-value">{formatKes(spentThisMonth)}</div>
              <div className="stat-sub">
                {lastTopup ? `last top-up ${when(lastTopup.createdAt)}` : 'no top-ups yet'}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">
                <IconFingerprint className="ic" /> Fingerprints
              </div>
              <div className="stat-value">{fingers.data ? fingers.data.fingers.length : '–'}</div>
              <div className="stat-sub">
                {fingers.data?.fingers.length
                  ? `on file · quality ${fingers.data.fingers.map((f) => f.quality).join(', ')}`
                  : 'not enrolled — cannot pay at the till'}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="card">
              <div className="card-head">
                <h2>Activity</h2>
                <p>Top-ups and purchases on this wallet</p>
              </div>
              {txns.isLoading ? (
                <SkeletonRows rows={5} />
              ) : txns.isError ? (
                <ErrorState onRetry={() => void txns.refetch()} />
              ) : (
                <StudentTxns rows={rows} />
              )}
            </div>

            <div className="stack">
              <TopUpCard
                memberId={memberId}
                guardians={guardians}
                balanceCents={d.balanceCents}
                pending={pending}
                onSent={(phone) => setPending({ phone, balanceBefore: d.balanceCents })}
              />

              <GuardiansCard memberId={memberId} guardians={guardians} onLinked={() => void qc.invalidateQueries({ queryKey: ['member', memberId] })} />

              <div className="card">
                <div className="card-head">
                  <h2>Spending limits</h2>
                  <p>Set by the parent in the ShulePay app</p>
                </div>
                <div className="card-body">
                  {d.limits.length === 0 ? (
                    <p className="muted">No limits set — this student can spend their full balance.</p>
                  ) : (
                    <dl className="kv">
                      {d.limits.map((l) => (
                        <div key={l.period} style={{ display: 'contents' }}>
                          <dt className="kind">{l.period}</dt>
                          <dd>{formatKes(l.capCents)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="field-hint" style={{ marginTop: 10 }}>
                    The school cannot change these.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StudentTxns({ rows }: { rows: MemberTxn[] }): JSX.Element {
  if (rows.length === 0) return <div className="empty">Nothing yet — this wallet has never moved.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Reference</th>
            <th className="right">Amount</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td className="kind strong">{t.kind}</td>
              <td className="mono muted">{t.reference ?? '—'}</td>
              <td className={`right ${t.amountCents >= 0 ? 'amount-pos' : 'amount-neg'}`}>
                {t.amountCents >= 0 ? '+' : '−'}
                {formatKes(Math.abs(t.amountCents))}
              </td>
              <td className="mono">{when(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopUpCard({
  memberId,
  guardians,
  balanceCents,
  pending,
  onSent,
}: {
  memberId: string;
  guardians: { name: string | null; phone: string }[];
  balanceCents: number;
  pending: { phone: string } | null;
  onSent: (phone: string) => void;
}): JSX.Element {
  const toast = useToast();
  const [payer, setPayer] = useState('');
  const [otherPhone, setOtherPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // '' means "not chosen yet" — fall back to the first guardian, the usual payer.
  const selected = payer || guardians[0]?.phone || 'other';
  const shillings = Math.floor(Number(amount));

  const topup = useMutation({
    mutationFn: (phone: string) => api.topupMember(memberId, shillings * 100, phone),
    onSuccess: (res) => {
      toast.push('ok', `M-Pesa request sent to ${formatPhone(res.payerPhone)}`);
      onSent(res.payerPhone);
      setAmount('');
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not send the M-Pesa request'),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    setError(null);
    const phone = selected === 'other' ? normalizePhone(otherPhone) : selected;
    if (!phone) {
      setError('Enter a valid Kenyan number, e.g. 0712 345 678.');
      return;
    }
    if (shillings < 1) {
      setError('Enter an amount in whole shillings.');
      return;
    }
    topup.mutate(phone);
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head">
        <h2>Top up wallet</h2>
        <p>Prompts a payer on M-Pesa</p>
      </div>
      <div className="card-body">
        <div className="payer-choices">
          {guardians.map((g) => (
            <label key={g.phone} className={`payer ${selected === g.phone ? 'is-on' : ''}`}>
              <input
                type="radio"
                name="payer"
                checked={selected === g.phone}
                onChange={() => setPayer(g.phone)}
              />
              <span className="payer-who">
                <strong>{g.name ?? 'Guardian'}</strong>
                <span className="mono muted">{formatPhone(g.phone)}</span>
              </span>
            </label>
          ))}
          <label className={`payer ${selected === 'other' ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="payer"
              checked={selected === 'other'}
              onChange={() => setPayer('other')}
            />
            <span className="payer-who">
              <strong>Someone else</strong>
              <span className="muted">a relative paying today</span>
            </span>
          </label>
        </div>

        {selected === 'other' && (
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="topup-phone">Their phone</label>
            <input
              id="topup-phone"
              className="input"
              type="tel"
              placeholder="0712 345 678"
              value={otherPhone}
              onChange={(e) => setOtherPhone(e.target.value)}
            />
          </div>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="topup-amount">Amount (KES)</label>
          <input
            id="topup-amount"
            className="input"
            type="number"
            min="1"
            step="1"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="quick-amounts">
          {[100, 200, 500, 1000].map((v) => (
            <button key={v} type="button" className="chip-btn" onClick={() => setAmount(String(v))}>
              {v.toLocaleString('en-KE')}
            </button>
          ))}
        </div>

        {error && <p className="field-error" style={{ marginTop: 10 }}>{error}</p>}

        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={topup.isPending}>
          {topup.isPending ? 'Sending…' : 'Send M-Pesa request'}
        </button>

        {pending ? (
          <p className="topup-waiting">
            Waiting for {formatPhone(pending.phone)} to enter their PIN…
          </p>
        ) : (
          <p className="field-hint" style={{ marginTop: 10 }}>
            The wallet is credited once they approve — balance {formatKes(balanceCents)} until then.
          </p>
        )}
      </div>
    </form>
  );
}

function GuardiansCard({
  memberId,
  guardians,
  onLinked,
}: {
  memberId: string;
  guardians: { name: string | null; phone: string }[];
  onLinked: () => void;
}): JSX.Element {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const link = useMutation({
    mutationFn: (normalized: string) => api.linkGuardian(memberId, normalized, name.trim() || undefined),
    onSuccess: () => {
      toast.push('ok', 'Guardian linked');
      setAdding(false);
      setPhone('');
      setName('');
      onLinked();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not link that guardian'),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('Enter a valid Kenyan number, e.g. 0712 345 678.');
      return;
    }
    link.mutate(normalized);
  }

  return (
    <div className="card">
      <div className="card-head row">
        <div>
          <h2>Guardians</h2>
          <p>Who can fund and set limits</p>
        </div>
        <span className="spacer" />
        {!adding && (
          <button className="btn btn-ghost" onClick={() => setAdding(true)}>
            Add
          </button>
        )}
      </div>
      <div className="card-body">
        {guardians.length === 0 && !adding ? (
          <p className="muted">No guardian linked — nobody can top this wallet up from the app.</p>
        ) : (
          <ul className="people">
            {guardians.map((g) => (
              <li key={g.phone}>
                <IconCheck className="ic" />
                <span>
                  <strong>{g.name ?? 'Guardian'}</strong>
                  <span className="mono muted">{formatPhone(g.phone)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {adding && (
          <form onSubmit={submit} className="stack-sm" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="g-phone">Phone</label>
              <input
                id="g-phone"
                className="input"
                type="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="g-name">Name (optional)</label>
              <input
                id="g-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error && <p className="field-error">{error}</p>}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" disabled={link.isPending}>
                {link.isPending ? 'Linking…' : 'Link guardian'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
