import { useQuery } from '@tanstack/react-query';
import { api, formatKes } from '@renderer/api/client';

export function Students({ orgId }: { orgId: string }): JSX.Element {
  const q = useQuery({ queryKey: ['students', orgId], queryFn: () => api.listStudents(orgId) });

  return (
    <div className="card">
      <div className="card-head row">
        <div>
          <h2>Students</h2>
          <p>{q.data ? `${q.data.count} onboarded` : 'Loading…'}</p>
        </div>
      </div>
      {q.isLoading ? (
        <div className="empty">Loading…</div>
      ) : (q.data?.members.length ?? 0) === 0 ? (
        <div className="empty">No students yet — onboard your first one.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Admission no.</th>
                <th>Status</th>
                <th className="right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.members.map((m) => (
                <tr key={m.id}>
                  <td className="strong">{m.name}</td>
                  <td className="mono">{m.accountNumber}</td>
                  <td>
                    <span className={`dot ${m.status === 'active' ? 'dot-active' : 'dot-idle'}`} />{' '}
                    <span className="kind">{m.status}</span>
                  </td>
                  <td className="right strong">{formatKes(m.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
