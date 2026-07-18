import { useQuery } from '@tanstack/react-query';
import { api } from '@renderer/api/client';
import { TxnList } from '@renderer/components/TxnList';

export function Transactions({ orgId }: { orgId: string }): JSX.Element {
  const q = useQuery({ queryKey: ['txns', orgId], queryFn: () => api.transactions(orgId) });
  return (
    <div className="card">
      <div className="card-head">
        <h2>Transactions</h2>
        <p>Top-ups, purchases, and withdrawals across the school.</p>
      </div>
      {q.isLoading ? <div className="empty">Loading…</div> : <TxnList txns={q.data?.transactions ?? []} />}
    </div>
  );
}
