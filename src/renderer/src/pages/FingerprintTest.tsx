import { useEffect, useState } from 'react';
import { Logo } from '@renderer/components/Logo';
import { IconCheck, IconFingerprint, IconRefresh } from '@renderer/components/icons';
import type { CaptureResult, ReaderStatus } from '@shared/bridge';

/** Decoded byte length of a base64 string, without pulling in Node's Buffer (unavailable in the sandboxed renderer). */
function base64ByteLength(b64: string): number {
  return atob(b64).length;
}

/** Dev-only reader smoke test, reachable from the login screen without signing in. */
export function FingerprintTest({ onBack }: { onBack: () => void }): JSX.Element {
  const [status, setStatus] = useState<ReaderStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ at: string; result: CaptureResult }[]>([]);

  async function loadStatus(): Promise<void> {
    setStatusError(null);
    try {
      setStatus(await window.thumbpay.fingerprint.status());
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Could not reach the fingerprint bridge.');
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function scan(): Promise<void> {
    setScanning(true);
    setCaptureError(null);
    try {
      const result = await window.thumbpay.fingerprint.capture();
      setCapture(result);
      setHistory((h) => [{ at: new Date().toLocaleTimeString(), result }, ...h].slice(0, 10));
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Capture failed.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-pane" style={{ maxWidth: 560 }}>
        <div className="auth-card">
          <Logo size={44} />
          <h1 className="auth-title">Fingerprint reader test</h1>
          <p className="auth-sub">Dev tool — scans the reader and shows raw results. No sign-in needed.</p>

          <div className="stack">
            <div className="row" style={{ alignItems: 'center', gap: 10 }}>
              <span className={`badge ${status?.connected ? 'badge-ok' : 'badge-warn'}`}>
                {status ? (status.connected ? 'Connected' : 'Not connected') : 'Checking…'}
              </span>
              {status?.simulated && <span className="badge badge-neutral">Simulated</span>}
              <button type="button" className="icon-btn" onClick={() => void loadStatus()} aria-label="Refresh status">
                <IconRefresh className="ic" />
              </button>
            </div>

            {statusError && (
              <p className="error-text" role="alert">
                {statusError}
              </p>
            )}
            {status?.message && <p className="field-hint">{status.message}</p>}
            {status?.deviceName && <p className="field-hint">Device: {status.deviceName}</p>}

            <div className="scanpad">
              <div className={`scan-visual ${scanning ? 'scanning' : capture ? 'captured' : ''}`} aria-hidden="true">
                {capture && !scanning ? <IconCheck className="ic" /> : <IconFingerprint className="ic" />}
              </div>
              <div className="scan-status" role="status">
                {scanning ? 'Scanning. Place a finger on the reader…' : 'Place a finger on the reader and press scan.'}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => void scan()} disabled={scanning}>
                {scanning ? 'Scanning…' : 'Scan fingerprint'}
              </button>
            </div>

            {captureError && (
              <p className="error-text" role="alert">
                {captureError}
              </p>
            )}

            {capture && (
              <div className="notice notice-info">
                <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <span className={`badge ${capture.quality >= 40 ? 'badge-ok' : 'badge-warn'}`}>
                    Quality {capture.quality}
                  </span>
                  <span className="badge badge-neutral">{capture.simulated ? 'Simulated capture' : 'Real capture'}</span>
                  <span className="badge badge-neutral">{base64ByteLength(capture.template)} bytes</span>
                </div>
                <p
                  className="mono"
                  style={{ marginTop: 10, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}
                >
                  {capture.template}
                </p>
              </div>
            )}

            {history.length > 0 && (
              <div className="stack" style={{ gap: 6 }}>
                <span className="field-hint">Recent scans</span>
                {history.map((h, i) => (
                  <div key={i} className="row" style={{ gap: 10, fontSize: 13 }}>
                    <span className="muted">{h.at}</span>
                    <span>quality {h.result.quality}</span>
                    <span className="muted">{h.result.simulated ? 'simulated' : 'real'}</span>
                    <span className="muted">{base64ByteLength(h.result.template)}b</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="auth-foot">
            <button
              type="button"
              className="link"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={onBack}
            >
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
