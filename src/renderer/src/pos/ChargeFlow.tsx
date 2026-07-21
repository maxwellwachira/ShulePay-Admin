import { useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  pos,
  formatKes,
  type IdentifiedStudent,
  type PurchaseResult,
  type StudentSummary,
} from '@renderer/api/client';
import { IconFingerprint, IconCheck, IconAlert, IconSearch } from '@renderer/components/icons';
import { describeFailure, type SaleFailure } from './errors';
import { toCartLines, type CartEntry } from './cart';

/** Who is being charged, and by which route we proved it. */
interface Payer {
  name: string;
  accountNumber: string;
  memberId?: string;
  balanceCents?: number;
  /** Present only on the biometric path — reused for the charge so one touch is enough. */
  fingerprintTemplate?: string;
}

type Stage =
  | { name: 'scanning' }
  | { name: 'lookup' }
  | { name: 'confirm'; payer: Payer }
  | { name: 'charging'; payer: Payer }
  | { name: 'done'; payer: Payer; result: PurchaseResult }
  | { name: 'failed'; failure: SaleFailure; payer: Payer | null };

export interface ChargeFlowProps {
  entries: CartEntry[];
  totalCents: number;
  /** The org's students, when this user may list them — powers the account fallback. */
  students: StudentSummary[] | null;
  onCancel: () => void;
  /** The sale succeeded and the cashier is ready for the next one. */
  onComplete: () => void;
  onRefreshCatalog: () => void;
  onNeedsPairing: () => void;
}

export function ChargeFlow({
  entries,
  totalCents,
  students,
  onCancel,
  onComplete,
  onRefreshCatalog,
  onNeedsPairing,
}: ChargeFlowProps): JSX.Element {
  const [stage, setStage] = useState<Stage>({ name: 'scanning' });

  /**
   * Minted ONCE per sale and deliberately kept across retries: it is what lets a
   * timed-out charge be sent again without any risk of taking the money twice. It only
   * changes when the cashier starts a genuinely new sale.
   */
  const idempotencyKey = useRef(`sale-${crypto.randomUUID()}`).current;
  const lines = useMemo(() => toCartLines(entries), [entries]);

  async function scan(): Promise<void> {
    setStage({ name: 'scanning' });
    try {
      const capture = await window.shulepay.fingerprint.capture();
      const student = await identifyThenPreview(capture.template);
      setStage({ name: 'confirm', payer: student });
    } catch (err) {
      const failure = describeFailure(err);
      if (failure.recovery === 'pair_device') onNeedsPairing();
      setStage({ name: 'failed', failure, payer: null });
    }
  }

  /** Resolve the finger, then best-effort the balance so the cashier sees the impact. */
  async function identifyThenPreview(template: string): Promise<Payer> {
    const found: IdentifiedStudent = await pos.identify(template);
    const payer: Payer = {
      name: found.name,
      accountNumber: found.accountNumber,
      memberId: found.memberId,
      fingerprintTemplate: template,
    };
    try {
      payer.balanceCents = (await api.memberBalance(found.memberId)).balanceCents;
    } catch {
      // Cashier-role sessions cannot read balances. Not worth blocking a sale over —
      // the receipt shows the new balance either way.
    }
    return payer;
  }

  async function charge(payer: Payer): Promise<void> {
    setStage({ name: 'charging', payer });
    try {
      const result = await pos.purchase({
        amountCents: totalCents,
        idempotencyKey,
        items: lines,
        ...(payer.fingerprintTemplate
          ? { fingerprintTemplate: payer.fingerprintTemplate }
          : { accountNumber: payer.accountNumber }),
      });
      setStage({ name: 'done', payer, result });
    } catch (err) {
      const failure = describeFailure(err);
      if (failure.recovery === 'pair_device') onNeedsPairing();
      setStage({ name: 'failed', failure, payer });
    }
  }

  // Start on the reader as soon as the overlay opens: the student's finger is already
  // coming down, and making the cashier click "scan" first would waste that motion.
  useEffect(() => {
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter is the accelerator through the whole flow; Escape backs out of anything that
  // has not yet moved money.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && stage.name !== 'charging') {
        e.preventDefault();
        if (stage.name === 'done') onComplete();
        else onCancel();
        return;
      }
      if (e.key !== 'Enter') return;
      if (stage.name === 'confirm') {
        e.preventDefault();
        void charge(stage.payer);
      } else if (stage.name === 'done') {
        e.preventDefault();
        onComplete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="till-overlay" role="dialog" aria-modal="true" aria-label="Take payment">
      <div className="till-sheet">
        {stage.name === 'scanning' && (
          <Scanning
            totalCents={totalCents}
            onUseAccount={() => setStage({ name: 'lookup' })}
            onCancel={onCancel}
          />
        )}

        {stage.name === 'lookup' && (
          <AccountLookup
            students={students}
            totalCents={totalCents}
            onPick={(payer) => setStage({ name: 'confirm', payer })}
            onBack={() => void scan()}
            onCancel={onCancel}
          />
        )}

        {stage.name === 'confirm' && (
          <Confirm
            payer={stage.payer}
            totalCents={totalCents}
            onCharge={() => void charge(stage.payer)}
            onCancel={onCancel}
          />
        )}

        {stage.name === 'charging' && <Charging payer={stage.payer} totalCents={totalCents} />}

        {stage.name === 'done' && (
          <Receipt
            payer={stage.payer}
            entries={entries}
            totalCents={totalCents}
            result={stage.result}
            onNext={onComplete}
          />
        )}

        {stage.name === 'failed' && (
          <Failed
            failure={stage.failure}
            onRescan={() => void scan()}
            onUseAccount={() => setStage({ name: 'lookup' })}
            onRetryCharge={() => (stage.payer ? void charge(stage.payer) : void scan())}
            onRefreshCatalog={() => {
              onRefreshCatalog();
              onCancel();
            }}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

// --- Stages --------------------------------------------------------------------

function AmountBanner({ totalCents, label }: { totalCents: number; label: string }): JSX.Element {
  return (
    <div className="till-amount">
      <span className="till-amount-label">{label}</span>
      <strong>{formatKes(totalCents)}</strong>
    </div>
  );
}

function Scanning({
  totalCents,
  onUseAccount,
  onCancel,
}: {
  totalCents: number;
  onUseAccount: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <div className="till-stage">
      <AmountBanner totalCents={totalCents} label="Charging" />
      <div className="scan-visual scanning" aria-hidden="true">
        <IconFingerprint className="ic" />
      </div>
      <h2>Place finger on the reader</h2>
      <p className="muted" role="status">
        Hold still until it beeps.
      </p>
      <div className="row till-stage-actions">
        {/* Offered up front, not only after a failure: a student may not be enrolled,
            and a dead reader shouldn't cost the queue a doomed scan first. */}
        <button className="btn btn-secondary btn-lg" onClick={onUseAccount}>
          Use account number
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onCancel}>
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
}

function Confirm({
  payer,
  totalCents,
  onCharge,
  onCancel,
}: {
  payer: Payer;
  totalCents: number;
  onCharge: () => void;
  onCancel: () => void;
}): JSX.Element {
  const short = payer.balanceCents !== undefined && payer.balanceCents < totalCents;
  return (
    <div className="till-stage">
      <div className="till-payer">
        <div className="till-payer-avatar" aria-hidden="true">
          {payer.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="till-payer-name">{payer.name}</h2>
        <div className="till-payer-meta mono">{payer.accountNumber}</div>
      </div>

      <div className="till-ledger">
        <div className="till-ledger-row">
          <span>Charge</span>
          <strong>{formatKes(totalCents)}</strong>
        </div>
        {payer.balanceCents !== undefined && (
          <>
            <div className="till-ledger-row muted">
              <span>Balance now</span>
              <span>{formatKes(payer.balanceCents)}</span>
            </div>
            <div className={`till-ledger-row after ${short ? 'short' : ''}`}>
              <span>Balance after</span>
              <strong>{formatKes(payer.balanceCents - totalCents)}</strong>
            </div>
          </>
        )}
      </div>

      {short && (
        <div className="notice notice-warn">
          This is more than they have. Charging will be declined — remove an item or ask
          for a top-up.
        </div>
      )}

      <div className="row till-stage-actions">
        <button className="btn btn-primary btn-xl" onClick={onCharge} autoFocus>
          Charge {formatKes(totalCents)} · Enter
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onCancel}>
          Not them (Esc)
        </button>
      </div>
    </div>
  );
}

function Charging({ payer, totalCents }: { payer: Payer; totalCents: number }): JSX.Element {
  return (
    <div className="till-stage">
      <div className="scan-visual scanning" aria-hidden="true">
        <IconFingerprint className="ic" />
      </div>
      <h2>Charging {payer.name}…</h2>
      <p className="muted" role="status">
        {formatKes(totalCents)} — don't close this window.
      </p>
    </div>
  );
}

function Receipt({
  payer,
  entries,
  totalCents,
  result,
  onNext,
}: {
  payer: Payer;
  entries: CartEntry[];
  totalCents: number;
  result: PurchaseResult;
  onNext: () => void;
}): JSX.Element {
  return (
    <div className="till-stage">
      <div className="done-badge" aria-hidden="true">
        <IconCheck className="ic" />
      </div>
      <h2>Paid · {formatKes(totalCents)}</h2>
      <p className="muted">
        {payer.name} <span className="mono">({payer.accountNumber})</span>
      </p>

      <div className="till-receipt" role="status">
        {entries.map((e) => (
          <div key={e.product.id} className="till-receipt-row">
            <span>
              {e.quantity}× {e.product.name}
            </span>
            <span className="mono">{formatKes(e.product.priceCents * e.quantity)}</span>
          </div>
        ))}
      </div>

      {/* The number the student actually cares about, and the one they will ask for. */}
      <div className="till-newbalance">
        <span>Balance left</span>
        <strong>{formatKes(result.balanceCents)}</strong>
      </div>

      {result.idempotent && (
        <div className="notice notice-info">
          This sale had already gone through — they were charged once, not twice.
        </div>
      )}

      <div className="row till-stage-actions">
        <button className="btn btn-primary btn-xl" onClick={onNext} autoFocus>
          Next sale · Enter
        </button>
      </div>
    </div>
  );
}

function Failed({
  failure,
  onRescan,
  onUseAccount,
  onRetryCharge,
  onRefreshCatalog,
  onCancel,
}: {
  failure: SaleFailure;
  onRescan: () => void;
  onUseAccount: () => void;
  onRetryCharge: () => void;
  onRefreshCatalog: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <div className="till-stage">
      <div className="state-icon err" aria-hidden="true">
        <IconAlert className="ic" />
      </div>
      <h2>{failure.title}</h2>
      <p className="muted till-failure-detail" role="alert">
        {failure.detail}
      </p>

      <div className="row till-stage-actions">
        {failure.recovery === 'retry_scan' && (
          <>
            <button className="btn btn-primary btn-lg" onClick={onRescan} autoFocus>
              Scan again
            </button>
            <button className="btn btn-secondary btn-lg" onClick={onUseAccount}>
              Use account number
            </button>
          </>
        )}
        {failure.recovery === 'use_account' && (
          <button className="btn btn-primary btn-lg" onClick={onUseAccount} autoFocus>
            Use account number
          </button>
        )}
        {failure.recovery === 'retry_charge' && (
          <button className="btn btn-primary btn-lg" onClick={onRetryCharge} autoFocus>
            Retry
          </button>
        )}
        {failure.recovery === 'refresh_catalog' && (
          <button className="btn btn-primary btn-lg" onClick={onRefreshCatalog} autoFocus>
            Refresh items
          </button>
        )}
        <button className="btn btn-ghost btn-lg" onClick={onCancel}>
          {failure.recovery === 'edit_cart' ? 'Back to the sale (Esc)' : 'Cancel (Esc)'}
        </button>
      </div>
    </div>
  );
}

/**
 * The non-biometric path: find the student by name or account number. It exists for
 * unenrolled students, unreadable fingers, and a broken reader — so it has to be fast
 * enough to use in front of a queue, not a punishment.
 */
function AccountLookup({
  students,
  totalCents,
  onPick,
  onBack,
  onCancel,
}: {
  students: StudentSummary[] | null;
  totalCents: number;
  onPick: (payer: Payer) => void;
  onBack: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!students || term.length === 0) return [];
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) || s.accountNumber.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [students, term]);

  function pickTyped(): void {
    if (matches.length > 0) {
      const s = matches[0];
      if (s) {
        onPick({ name: s.name, accountNumber: s.accountNumber, balanceCents: s.balanceCents });
      }
      return;
    }
    // No student list to search (cashier sessions can't list them) — trust the typed
    // account number and let the server be the judge.
    if (term.length > 0) onPick({ name: 'Account ' + query.trim(), accountNumber: query.trim() });
  }

  return (
    <div className="till-stage">
      <AmountBanner totalCents={totalCents} label="Charging" />
      <h2>Find the student</h2>
      <div className="till-search">
        <IconSearch className="ic" />
        <input
          className="input"
          placeholder={students ? 'Name or account number' : 'Account number'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              pickTyped();
            }
          }}
          autoFocus
        />
      </div>

      {matches.length > 0 && (
        <div className="till-matches">
          {matches.map((s) => (
            <button
              key={s.id}
              className="till-match"
              onClick={() =>
                onPick({
                  name: s.name,
                  accountNumber: s.accountNumber,
                  balanceCents: s.balanceCents,
                })
              }
            >
              <span className="till-match-name">{s.name}</span>
              <span className="till-match-acc mono">{s.accountNumber}</span>
              <span className="till-match-bal">{formatKes(s.balanceCents)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="row till-stage-actions">
        <button className="btn btn-secondary btn-lg" onClick={onBack}>
          Back to fingerprint
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onCancel}>
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
}
