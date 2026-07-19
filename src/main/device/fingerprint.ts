import { randomBytes } from 'node:crypto';
import type { CaptureResult } from '@shared/bridge';

/**
 * Fingerprint reader abstraction - the seam where a vendor USB SDK plugs in. It runs
 * in the MAIN process (Node has native/USB access; the sandboxed renderer does not).
 * The stub returns a random template so the enrollment UI is buildable before hardware
 * arrives; swap `capture` for the vendor SDK call (which yields a template + a quality
 * score, never a raw image).
 */
export interface FingerprintReader {
  capture(): Promise<CaptureResult>;
}

const stubReader: FingerprintReader = {
  async capture() {
    // Simulate the time a real sensor takes so the UI's scanning state is exercised.
    await new Promise((r) => setTimeout(r, 1400));
    return {
      template: randomBytes(64).toString('base64'),
      quality: 60 + Math.floor(Math.random() * 40), // 60..99
    };
  },
};

export const fingerprintReader: FingerprintReader = stubReader;
