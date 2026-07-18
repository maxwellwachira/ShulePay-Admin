import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatKes } from '@renderer/api/client';
import { StudentDetail } from './StudentDetail';

export function Students({ orgId }: { orgId: string }): JSX.Element {
  const q = useQuery({ queryKey: ['students', orgId], queryFn: () => api.listStudents(orgId) });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = q.data?.members ?? [];
    if (!term) return all;
    return all.filter(
      (m) => m.name.toLowerCase().includes(term) || m.accountNumber.toLowerCase().includes(term),
    );
  }, [q.data, search]);

  return (
    <div className="card">
      <div className="card-head row">
        <div>
          <h2>Students</h2>
          <p>{q.data ? `${q.data.count} onboarded` : 'Loading…'}</p>
        </div>
        <span className="spacer" />
        <input
          className="input search"
          placeholder="Search name or admission no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {q.isLoading ? (
        <div className="empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">{search ? 'No matching students.' : 'No students yet — onboard your first one.'}</div>
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
              {filtered.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => setSelected(m.id)}>
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

      {selected && <StudentDetail memberId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
