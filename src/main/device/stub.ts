import { randomBytes } from 'node:crypto';
import type { CaptureResult, ReaderStatus } from '@shared/bridge';
import type { FingerprintReader } from './fingerprint';

/**
 * Simulated reader for development where no vendor SDK/device exists (notably macOS,
 * which ZKTeco does not support). It returns a random template so the enrollment and
 * verify UIs are fully exercisable before hardware arrives. Every result is flagged
 * `simulated` so nothing downstream mistakes a fabricated template for a real one.
 */
export class StubReader implements FingerprintReader {
  async capture(): Promise<CaptureResult> {
    await new Promise((r) => setTimeout(r, 1400)); // mimic sensor latency
    return {
      template: randomBytes(64).toString('base64'),
      quality: 60 + Math.floor(Math.random() * 40), // 60..99
      simulated: true,
    };
  }

  async status(): Promise<ReaderStatus> {
    return {
      connected: false,
      simulated: true,
      deviceName: null,
      message: 'No fingerprint reader on this platform — captures are simulated for development.',
    };
  }

  async dispose(): Promise<void> {
    // nothing to release
  }
}
