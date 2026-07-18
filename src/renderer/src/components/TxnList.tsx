import { formatKes, type OrgTxn } from '@renderer/api/client';

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function TxnList({ txns }: { txns: OrgTxn[] }): JSX.Element {
  if (txns.length === 0) return <div className="empty">No transactions yet.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Type</th>
            <th className="right">Amount</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="strong">{t.memberName}</div>
                <div className="mono">{t.accountNumber}</div>
              </td>
              <td className="kind">{t.kind}</td>
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
