import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatKes, ApiError } from '@renderer/api/client';
import { Modal } from '@renderer/components/Modal';
import { useToast } from '@renderer/components/Toast';
import { SkeletonRows, ErrorState } from '@renderer/components/ui';
import { FingerprintEnroll } from '@renderer/components/FingerprintEnroll';

export function StudentDetail({
  memberId,
  onClose,
}: {
  memberId: string;
  onClose: () => void;
}): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['member', memberId], queryFn: () => api.memberDetail(memberId) });

  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [cap, setCap] = useState('');

  const setLimit = useMutation({
    mutationFn: () => api.setLimit(memberId, period, Math.round(Number(cap) * 100)),
    onSuccess: () => {
      toast.push('ok', `${period === 'daily' ? 'Daily' : 'Weekly'} limit set to KES ${cap}`);
      setCap('');
      void qc.invalidateQueries({ queryKey: ['member', memberId] });
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Could not set limit'),
  });

  const d = q.data;

  return (
    <Modal title={d ? d.name : 'Student'} onClose={onClose}>
      {q.isLoading ? (
        <SkeletonRows rows={5} />
      ) : q.isError || !d ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className="row">
            <div>
              <div className="big-balance">{formatKes(d.balanceCents)}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                wallet balance
              </div>
            </div>
            <span className="spacer" />
            <span className={`badge kind ${d.status === 'active' ? 'badge-ok' : 'badge-neutral'}`}>
              {d.status}
            </span>
          </div>

          <dl className="kv" style={{ marginTop: 18 }}>
            <dt>Admission no.</dt>
            <dd className="mono">{d.accountNumber}</dd>
          </dl>

          <div className="subsection">
            <h3>Guardians</h3>
            {d.guardians.length === 0 ? (
              <p className="muted">No guardian linked.</p>
            ) : (
              <dl className="kv">
                {d.guardians.map((g) => (
                  <div key={g.phone} style={{ display: 'contents' }}>
                    <dt>{g.name ?? 'Guardian'}</dt>
                    <dd className="mono">{g.phone}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="subsection">
            <h3>Fingerprint</h3>
            <p className="muted" style={{ marginBottom: 10 }}>
              Enroll or re-enroll a fingerprint, e.g. for a student who skipped it during onboarding.
            </p>
            <FingerprintEnroll
              memberId={d.id}
              onEnrolled={() => toast.push('ok', 'Fingerprint enrolled.')}
            />
          </div>

          <div className="subsection">
            <h3>Spending limits</h3>
            {d.limits.length === 0 ? (
              <p className="muted">No limits set. This student can spend their full balance.</p>
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
            <div className="limit-row" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Period</label>
                <select
                  className="input"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly')}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="field">
                <label>Cap (KES)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="e.g. 200"
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={setLimit.isPending || !cap || Number(cap) <= 0}
                onClick={() => setLimit.mutate()}
              >
                {setLimit.isPending ? 'Setting…' : 'Set'}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
