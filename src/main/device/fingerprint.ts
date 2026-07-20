import { platform, env } from 'node:process';
import type { CaptureResult, ReaderStatus } from '@shared/bridge';
import { StubReader } from './stub';
import { ZkFingerReader } from './zkfinger';

/**
 * Fingerprint reader abstraction — the seam where the vendor USB SDK plugs in. It runs
 * in the MAIN process (Node has native/USB access; the sandboxed renderer does not).
 * The renderer only ever receives a template + quality score, never a raw image.
 */
export interface FingerprintReader {
  /** Acquire one template. Used for enrollment and for verify-at-till capture. */
  capture(): Promise<CaptureResult>;
  /** Whether a physical reader is attached and usable right now. */
  status(): Promise<ReaderStatus>;
  /** Release the device/SDK on shutdown. */
  dispose(): Promise<void>;
}

/**
 * Pick a reader for this machine:
 *  - Windows/Linux → the real ZKFinger-backed reader (reports "not connected" via
 *    status() if the driver or device is missing, rather than faking captures).
 *  - macOS / anything else → the simulated reader, since ZKTeco ships no driver there.
 *
 * Set SHULEPAY_FORCE_SIMULATED_READER=1 to force the stub on any platform (useful for
 * demos on a Windows/Linux box without the reader plugged in).
 */
function selectReader(): FingerprintReader {
  const forceStub = env.SHULEPAY_FORCE_SIMULATED_READER === '1';
  const supported = platform === 'win32' || platform === 'linux';
  return !forceStub && supported ? new ZkFingerReader() : new StubReader();
}

export const fingerprintReader: FingerprintReader = selectReader();
