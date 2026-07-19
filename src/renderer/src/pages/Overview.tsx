import { useQuery } from '@tanstack/react-query';
import { api, formatKes } from '@renderer/api/client';
import { TxnList } from '@renderer/components/TxnList';
import { SkeletonStat, SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { IconStudents, IconReceipt, IconHome, IconZap } from '@renderer/components/icons';
import type { View } from '@renderer/components/nav';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

export function Overview({ orgId, onNavigate }: { orgId: string; onNavigate: (v: View) => void }): JSX.Element {
  const students = useQuery({ queryKey: ['students', orgId], queryFn: () => api.listStudents(orgId) });
  const txns = useQuery({ queryKey: ['txns', orgId], queryFn: () => api.transactions(orgId) });

  const totalBalance = (students.data?.members ?? []).reduce((s, m) => s + m.balanceCents, 0);
  const all = txns.data?.transactions ?? [];
  const today = all.filter((t) => isToday(t.createdAt));
  const spentToday = today.reduce((s, t) => s + (t.amountCents < 0 ? -t.amountCents : 0), 0);
  const recent = all.slice(0, 6);
  const loading = students.isLoading || txns.isLoading;

  return (
    <div className="stack">
      {loading ? (
        <div className="stat-row four">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      ) : (
        <div className="stat-row four">
          <div className="stat">
            <div className="stat-label">
              <IconStudents className="ic" /> Students
            </div>
            <div className="stat-value">{students.data?.count ?? '–'}</div>
            <div className="stat-sub">onboarded</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <IconHome className="ic" /> Wallet balances
            </div>
            <div className="stat-value">{students.data ? formatKes(totalBalance) : '–'}</div>
            <div className="stat-sub">held across all students</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <IconZap className="ic" /> Spent today
            </div>
            <div className="stat-value">{txns.data ? formatKes(spentToday) : '–'}</div>
            <div className="stat-sub">
              {today.length} transaction{today.length === 1 ? '' : 's'} today
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <IconReceipt className="ic" /> Activity
            </div>
            <div className="stat-value">{txns.data ? all.length : '–'}</div>
            <div className="stat-sub">recent transactions</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head row">
          <div>
            <h2>Recent activity</h2>
          </div>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('transactions')}>
            View all
          </button>
        </div>
        {txns.isLoading ? (
          <SkeletonRows rows={5} />
        ) : txns.isError ? (
          <ErrorState onRetry={() => void txns.refetch()} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={IconReceipt}
            title="No activity yet"
            hint="Transactions will appear here the moment students start topping up and paying."
          />
        ) : (
          <TxnList txns={recent} />
        )}
      </div>

      <div className="row">
        <button className="btn btn-primary" onClick={() => onNavigate('onboard')}>
          Onboard a student
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('students')}>
          View students
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
          Open reports
        </button>
      </div>
    </div>
  );
}
