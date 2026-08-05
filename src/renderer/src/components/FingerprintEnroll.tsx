import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';
import { IconFingerprint, IconCheck } from '@renderer/components/icons';
import type { CaptureResult } from '@shared/bridge';

const CONSENT_VERSION = 'guardian-consent-2026-v1';
const MIN_QUALITY = 40;

/**
 * Scan pad + consent + enroll, shared by the onboarding wizard (fresh capture) and the
 * student detail view (enrolling later for a student who skipped it, or re-enrolling).
 */
export function FingerprintEnroll({
  memberId,
  secondaryAction,
  onEnrolled,
}: {
  memberId: string;
  /** An extra button next to "Enroll fingerprint", e.g. "Skip for now" during onboarding. */
  secondaryAction?: { label: string; onClick: () => void };
  onEnrolled?: () => void;
}): JSX.Element {
  const toast = useToast();
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [consent, setConsent] = useState(false);

  const enroll = useMutation({
    mutationFn: () => {
      if (!capture) throw new Error('capture first');
      return api.enrollFingerprint(memberId, {
        fingerIndex: 1,
        template: capture.template,
        quality: capture.quality,
        consent,
        consentVersion: CONSENT_VERSION,
      });
    },
    onSuccess: () => {
      setCapture(null);
      setConsent(false);
      onEnrolled?.();
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Enrollment failed'),
  });

  async function scan(): Promise<void> {
    setScanning(true);
    try {
      setCapture(await window.thumbpay.fingerprint.capture());
    } catch {
      toast.push('err', 'Could not reach the fingerprint reader. Check the device and try again.');
    } finally {
      setScanning(false);
    }
  }

  const goodQuality = (capture?.quality ?? 0) >= MIN_QUALITY;

  return (
    <div className="stack">
      <div className="scanpad">
        <div className={`scan-visual ${scanning ? 'scanning' : capture ? 'captured' : ''}`} aria-hidden="true">
          {capture && !scanning ? <IconCheck className="ic" /> : <IconFingerprint className="ic" />}
        </div>
        <div className="scan-status" role="status">
          {scanning
            ? 'Scanning. Ask the student to hold their finger on the reader…'
            : capture
              ? goodQuality
                ? 'Good capture. You can enroll or re-scan.'
                : 'Capture quality is too low. Clean the finger and reader, then re-scan.'
              : 'Place the student’s right index finger on the reader.'}
        </div>
        <div className="row">
          <button
            type="button"
            className={capture ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => void scan()}
            disabled={scanning}
          >
            {scanning ? 'Scanning…' : capture ? 'Re-scan' : 'Scan fingerprint'}
          </button>
          {capture && !scanning && (
            <span className={`quality-pill ${goodQuality ? 'badge-ok' : 'badge-warn'}`}>
              Quality {capture.quality}
              {!goodQuality && ' · too low'}
            </span>
          )}
        </div>
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          The parent or guardian has consented to biometric enrollment for school payments
          <span className="muted"> ({CONSENT_VERSION})</span>.
        </span>
      </label>

      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={enroll.isPending || !capture || !consent || !goodQuality || scanning}
          onClick={() => enroll.mutate()}
        >
          {enroll.isPending ? 'Enrolling…' : 'Enroll fingerprint'}
        </button>
        {secondaryAction && (
          <button type="button" className="btn btn-ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
