import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import type { CaptureResult } from '@shared/bridge';

const CONSENT_VERSION = 'guardian-consent-2026-v1';

/**
 * Onboard a student and (optionally) enroll a fingerprint at the desk. The capture
 * runs on the reader via the main process; the renderer only ever sees a template.
 */
export function OnboardStudent(): JSX.Element {
  const [orgId, setOrgId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onboard = useMutation({
    mutationFn: () => api.onboardMember(orgId, { externalRef: accountNumber, name }),
    onSuccess: (m) => {
      setMemberId(m.id);
      setMessage(`Student created — account ${m.accountNumber}. Now enroll a fingerprint.`);
    },
    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'Onboarding failed'),
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
    onSuccess: () => setMessage('Fingerprint enrolled ✓ — student is ready.'),
    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'Enrollment failed'),
  });

  async function scan(): Promise<void> {
    setCapture(await window.shulepay.fingerprint.capture());
  }

  function submitOnboard(e: FormEvent): void {
    e.preventDefault();
    onboard.mutate();
  }

  return (
    <div className="card wide">
      <h2>Onboard a student</h2>
      <form onSubmit={submitOnboard}>
        <label>Organization ID<input value={orgId} onChange={(e) => setOrgId(e.target.value)} /></label>
        <label>Account number<input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></label>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button disabled={onboard.isPending || !orgId || !accountNumber || !name}>
          {onboard.isPending ? 'Creating…' : 'Create student'}
        </button>
      </form>

      {memberId && (
        <fieldset className="enroll">
          <legend>Biometric enrollment</legend>
          <button type="button" onClick={() => void scan()}>
            {capture ? `Re-scan (quality ${capture.quality})` : 'Scan fingerprint'}
          </button>
          {capture && (
            <p className={capture.quality >= 40 ? 'ok' : 'error'}>
              Captured — quality {capture.quality}{capture.quality < 40 ? ' (too low, re-scan)' : ''}
            </p>
          )}
          <label className="inline">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            Guardian consent recorded ({CONSENT_VERSION})
          </label>
          <button
            type="button"
            disabled={enroll.isPending || !capture || !consent || capture.quality < 40}
            onClick={() => enroll.mutate()}
          >
            {enroll.isPending ? 'Enrolling…' : 'Enroll fingerprint'}
          </button>
        </fieldset>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}
