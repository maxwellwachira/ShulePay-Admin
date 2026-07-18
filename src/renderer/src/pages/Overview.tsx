import { useQuery } from '@tanstack/react-query';
import { api, formatKes } from '@renderer/api/client';
import { TxnList } from '@renderer/components/TxnList';
import { IconStudents, IconReceipt, IconHome } from '@renderer/components/icons';
import type { View } from '@renderer/components/nav';

export function Overview({ orgId, onNavigate }: { orgId: string; onNavigate: (v: View) => void }): JSX.Element {
  const students = useQuery({ queryKey: ['students', orgId], queryFn: () => api.listStudents(orgId) });
  const txns = useQuery({ queryKey: ['txns', orgId], queryFn: () => api.transactions(orgId) });

  const totalBalance = (students.data?.members ?? []).reduce((s, m) => s + m.balanceCents, 0);
  const recent = (txns.data?.transactions ?? []).slice(0, 6);

  return (
    <div className="stack">
      <div className="stat-row">
        <div className="stat">
          <div className="stat-label"><IconStudents className="ic" /> Students</div>
          <div className="stat-value">{students.data?.count ?? '—'}</div>
          <div className="stat-sub">onboarded</div>
        </div>
        <div className="stat">
          <div className="stat-label"><IconHome className="ic" /> Wallet balances</div>
          <div className="stat-value">{students.isLoading ? '—' : formatKes(totalBalance)}</div>
          <div className="stat-sub">held across all students</div>
        </div>
        <div className="stat">
          <div className="stat-label"><IconReceipt className="ic" /> Activity</div>
          <div className="stat-value">{txns.data?.transactions.length ?? '—'}</div>
          <div className="stat-sub">recent transactions</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head row">
          <div><h2>Recent activity</h2></div>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => onNavigate('transactions')}>View all</button>
        </div>
        <TxnList txns={recent} />
      </div>

      <div className="row">
        <button className="btn btn-primary" onClick={() => onNavigate('onboard')}>Onboard a student</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('students')}>View students</button>
      </div>
    </div>
  );
}
