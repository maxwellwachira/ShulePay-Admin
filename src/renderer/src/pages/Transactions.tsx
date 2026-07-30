import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatKes } from '@renderer/api/client';
import { TxnList } from '@renderer/components/TxnList';
import { SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { IconReceipt, IconRefresh } from '@renderer/components/icons';

export function Transactions({ orgId }: { orgId: string }): JSX.Element {
  const q = useQuery({ queryKey: ['txns', orgId], queryFn: () => api.transactions(orgId) });
  const [kind, setKind] = useState<string>('all');
  const [search, setSearch] = useState('');

  const all = useMemo(() => q.data?.transactions ?? [], [q.data]);
  const kinds = useMemo(() => ['all', ...new Set(all.map((t) => t.kind))], [all]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (t) =>
        (kind === 'all' || t.kind === kind) &&
        (!term ||
          t.memberName.toLowerCase().includes(term) ||
          t.accountNumber.toLowerCase().includes(term)),
    );
  }, [all, kind, search]);

  const moneyIn = filtered.reduce((s, t) => s + (t.amountCents > 0 ? t.amountCents : 0), 0);
  const moneyOut = filtered.reduce((s, t) => s + (t.amountCents < 0 ? -t.amountCents : 0), 0);

  return (
    <div className="card">
      <div className="card-head toolbar">
        <div>
          <h2>Transactions</h2>
          <p>
            {q.data
              ? `${filtered.length} shown · in ${formatKes(moneyIn)} · out ${formatKes(moneyOut)}`
              : ' '}
          </p>
        </div>
        <span className="spacer" />
        {kinds.length > 1 && (
          <div className="seg" role="tablist" aria-label="Filter by type">
            {kinds.map((k) => (
              <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
        )}
        <input
          className="input search"
          placeholder="Search student or admission no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="icon-btn" onClick={() => void q.refetch()} aria-label="Refresh" title="Refresh">
          <IconRefresh className="ic" />
        </button>
      </div>

      {q.isLoading ? (
        <SkeletonRows rows={7} />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : filtered.length === 0 ? (
        all.length === 0 ? (
          <EmptyState
            icon={IconReceipt}
            title="No transactions yet"
            hint="Top-ups and purchases will land here in real time once students start using ThumbPay."
          />
        ) : (
          <EmptyState icon={IconReceipt} title="Nothing matches" hint="Try a different type or search." />
        )
      ) : (
        <TxnList txns={filtered} />
      )}
    </div>
  );
}
