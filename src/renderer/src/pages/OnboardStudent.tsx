import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { IconFingerprint } from '@renderer/components/icons';
import type { CaptureResult } from '@shared/bridge';

const CONSENT_VERSION = 'guardian-consent-2026-v1';
const MIN_QUALITY = 40;

/**
 * Onboard a student, then (optionally) enroll a fingerprint at the desk. The capture
 * runs on the reader via the main process; the renderer only ever sees a template.
 */
export function OnboardStudent(): JSX.Element {
  const [orgId, setOrgId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'info' | 'err'; text: string } | null>(null);

  const onboard = useMutation({
    mutationFn: () => api.onboardMember(orgId, { externalRef: accountNumber, name }),
    onSuccess: (m) => {
      setMemberId(m.id);
      setNotice({ kind: 'info', text: `Student created — account ${m.accountNumber}. Enroll a fingerprint below.` });
    },
    onError: (e) => setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Onboarding failed' }),
  });

  const enroll = useMutation({
    mutationFn: () => {
      if (!memberId || !capture) throw new Error('capture a fingerprint first');
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

  async function scan(): Promise<void> {
    setCapture(await window.shulepay.fingerprint.capture());
  }
  function submitOnboard(e: FormEvent): void {
    e.preventDefault();
    onboard.mutate();
  }

  const goodQuality = (capture?.quality ?? 0) >= MIN_QUALITY;

  return (
    <>
      <div className="page-head">
        <h1>Onboard a student</h1>
        <p>Create a wallet account and enroll a fingerprint for cashless payments.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Student details</h2>
          <p>The account number is what parents pay to via the school paybill.</p>
        </div>
        <div className="card-body">
          <form className="form-grid" onSubmit={submitOnboard}>
            <div className="field">
              <label>Organization ID</label>
              <input className="input" placeholder="school UUID" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
            </div>
            <div className="field">
              <label>Account number</label>
              <input className="input" placeholder="e.g. STU-001" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="field">
              <label>Full name</label>
              <input className="input" placeholder="e.g. Grace Njeri" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={onboard.isPending || !orgId || !accountNumber || !name}>
                {onboard.isPending ? 'Creating…' : 'Create student'}
              </button>
            </div>
          </form>

          {memberId && (
            <div className="enroll">
              <h3><IconFingerprint className="ic" /> Biometric enrollment</h3>
              <div className="scan-row">
                <button type="button" className="btn btn-secondary" onClick={() => void scan()}>
                  {capture ? 'Re-scan' : 'Scan fingerprint'}
                </button>
                {capture && (
                  <span className={`quality-pill ${goodQuality ? 'badge-ok' : 'badge-warn'}`}>
                    Quality {capture.quality}{!goodQuality && ' · too low'}
                  </span>
                )}
              </div>
              <label className="checkbox">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                Guardian consent recorded ({CONSENT_VERSION})
              </label>
              <div className="form-actions" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={enroll.isPending || !capture || !consent || !goodQuality}
                  onClick={() => enroll.mutate()}
                >
                  {enroll.isPending ? 'Enrolling…' : 'Enroll fingerprint'}
                </button>
              </div>
            </div>
          )}

          {notice && <div className={`notice notice-${notice.kind}`}>{notice.text}</div>}
        </div>
      </div>
    </>
  );
}
