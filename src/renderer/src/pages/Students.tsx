import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatKes } from '@renderer/api/client';
import { SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { IconStudents, IconRefresh } from '@renderer/components/icons';
import { StudentDetail } from './StudentDetail';
import type { View } from '@renderer/components/nav';

type StatusFilter = 'all' | 'active' | 'inactive';

export function Students({
  orgId,
  onNavigate,
}: {
  orgId: string;
  onNavigate: (v: View) => void;
}): JSX.Element {
  const q = useQuery({ queryKey: ['students', orgId], queryFn: () => api.listStudents(orgId) });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = q.data?.members ?? [];
    if (status !== 'all') {
      list = list.filter((m) => (status === 'active' ? m.status === 'active' : m.status !== 'active'));
    }
    if (term) {
      list = list.filter(
        (m) => m.name.toLowerCase().includes(term) || m.accountNumber.toLowerCase().includes(term),
      );
    }
    return list;
  }, [q.data, search, status]);

  return (
    <div className="card">
      <div className="card-head toolbar">
        <div>
          <h2>Students</h2>
          <p>{q.data ? `${q.data.count} onboarded` : ' '}</p>
        </div>
        <span className="spacer" />
        <div className="seg" role="tablist" aria-label="Filter by status">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
        <input
          className="input search"
          placeholder="Search name or admission no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="icon-btn"
          onClick={() => void q.refetch()}
          aria-label="Refresh"
          title="Refresh"
        >
          <IconRefresh className="ic" />
        </button>
      </div>

      {q.isLoading ? (
        <SkeletonRows rows={6} />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : filtered.length === 0 ? (
        search || status !== 'all' ? (
          <EmptyState icon={IconStudents} title="No matching students" hint="Try a different search or filter." />
        ) : (
          <EmptyState
            icon={IconStudents}
            title="No students yet"
            hint="Onboard your first student to start taking fingerprint payments."
            action={
              <button className="btn btn-primary" onClick={() => onNavigate('onboard')}>
                Onboard a student
              </button>
            }
          />
        )
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
