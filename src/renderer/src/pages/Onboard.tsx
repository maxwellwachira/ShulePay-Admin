import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { IconFingerprint } from '@renderer/components/icons';
import type { CaptureResult } from '@shared/bridge';

const CONSENT_VERSION = 'guardian-consent-2026-v1';
const MIN_QUALITY = 40;

export function Onboard({ orgId }: { orgId: string }): JSX.Element {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [admission, setAdmission] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'info' | 'err'; text: string } | null>(null);

  const onboard = useMutation({
    mutationFn: () =>
      api.onboardMember(orgId, {
        name,
        externalRef: admission,
        ...(guardianPhone ? { guardianPhone } : {}),
        ...(guardianName ? { guardianName } : {}),
      }),
    onSuccess: (m) => {
      setMemberId(m.id);
      void qc.invalidateQueries({ queryKey: ['students', orgId] });
      setNotice({ kind: 'info', text: `${m.name} created (${m.accountNumber}). Now enroll a fingerprint.` });
    },
    onError: (e) => setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Onboarding failed' }),
  });

  const enroll = useMutation({
    mutationFn: () => {
      if (!memberId || !capture) throw new Error('capture first');
      return api.enrollFingerprint(memberId, {
        fingerIndex: 1,
        template: capture.template,
        quality: capture.quality,
        consent,
        consentVersion: CONSENT_VERSION,
      });
    },
    onSuccess: () => setNotice({ kind: 'ok', text: 'Fingerprint enrolled — the student is ready.' }),
    onError: (e) => setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Enrollment failed' }),
  });

  function reset(): void {
    setName(''); setAdmission(''); setGuardianPhone(''); setGuardianName('');
    setMemberId(null); setCapture(null); setConsent(false); setNotice(null);
  }
  async function scan(): Promise<void> {
    setCapture(await window.shulepay.fingerprint.capture());
  }
  function submit(e: FormEvent): void {
    e.preventDefault();
    onboard.mutate();
  }

  const goodQuality = (capture?.quality ?? 0) >= MIN_QUALITY;
  const done = enroll.isSuccess;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Onboard a student</h2>
        <p>Capture the student's details, parent's phone, and fingerprint.</p>
      </div>
      <div className="card-body">
        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label>Student name</label>
            <input className="input" placeholder="Grace Njeri" value={name} disabled={!!memberId}
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Admission number</label>
            <input className="input" placeholder="ADM-2024-001" value={admission} disabled={!!memberId}
              onChange={(e) => setAdmission(e.target.value)} />
          </div>
          <div className="field">
            <label>Parent / guardian phone</label>
            <input className="input" placeholder="2547…" value={guardianPhone} disabled={!!memberId}
              onChange={(e) => setGuardianPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Parent / guardian name <span className="muted">(optional)</span></label>
            <input className="input" placeholder="Mama Grace" value={guardianName} disabled={!!memberId}
              onChange={(e) => setGuardianName(e.target.value)} />
          </div>
          {!memberId && (
            <div className="form-actions">
              <button className="btn btn-primary" disabled={onboard.isPending || !name || !admission || !guardianPhone}>
                {onboard.isPending ? 'Creating…' : 'Create student'}
              </button>
            </div>
          )}
        </form>

        {memberId && (
          <div className="enroll">
            <h3><IconFingerprint className="ic" /> Biometric enrollment</h3>
            <div className="scan-row">
              <button type="button" className="btn btn-secondary" onClick={() => void scan()} disabled={done}>
                {capture ? 'Re-scan' : 'Scan fingerprint'}
              </button>
              {capture && (
                <span className={`quality-pill ${goodQuality ? 'badge-ok' : 'badge-warn'}`}>
                  Quality {capture.quality}{!goodQuality && ' · too low'}
                </span>
              )}
            </div>
            <label className="checkbox">
              <input type="checkbox" checked={consent} disabled={done} onChange={(e) => setConsent(e.target.checked)} />
              Guardian consent recorded ({CONSENT_VERSION})
            </label>
            <div className="row" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-primary"
                disabled={enroll.isPending || done || !capture || !consent || !goodQuality}
                onClick={() => enroll.mutate()}>
                {enroll.isPending ? 'Enrolling…' : 'Enroll fingerprint'}
              </button>
              {done && <button type="button" className="btn btn-secondary" onClick={reset}>Onboard another</button>}
            </div>
          </div>
        )}

        {notice && <div className={`notice notice-${notice.kind}`}>{notice.text}</div>}
      </div>
    </div>
  );
}
