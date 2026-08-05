import { platform, env } from 'node:process';
import { join } from 'node:path';
import { app } from 'electron';
import * as koffi from 'koffi';
import type { CaptureResult, ReaderStatus } from '@shared/bridge';
import type { FingerprintReader } from './fingerprint';

/**
 * Real reader for ZKTeco optical scanners (ZK9500 and siblings) built on the vendor
 * ZKFinger SDK (`libzkfp`). We bind the C API with koffi — a maintained FFI whose
 * ABI-stable N-API prebuilds load under Electron with no native rebuild.
 *
 * ZKTeco ships `libzkfp` for Windows (libzkfp.dll) and Linux (libzkfp.so) only; there
 * is no macOS driver, so the platform selector never picks this reader there.
 *
 * The signatures below follow ZKFinger's documented C API. They MUST be verified against
 * the exact SDK version on real hardware — a struct/enum drift between SDK releases is
 * the most likely cause of a bad capture, so treat first-boot-on-device as the real test.
 */

const TEMPLATE_MAX = 2048; // vendor max template size in bytes
const PARAM_IMAGE_WIDTH = 1;
const PARAM_IMAGE_HEIGHT = 2;
const ZKFP_OK = 0;

const CAPTURE_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 120;

/** The subset of the libzkfp C API we call, once bound through koffi. */
interface ZkfpBinding {
  init(): number;
  terminate(): number;
  deviceCount(): number;
  openDevice(index: number): unknown; // opaque HANDLE
  closeDevice(handle: unknown): number;
  getParameter(handle: unknown, code: number): number | null;
  acquire(handle: unknown, image: Buffer, template: Buffer, size: number[]): Promise<number>;
}

/** Bind the vendor library, or return a reason string if it can't be loaded. */
function bind(): ZkfpBinding | string {
  const libPath = env.THUMBPAY_ZKFINGER_LIB ?? defaultLibName();
  let lib: ReturnType<typeof koffi.load>;
  try {
    lib = koffi.load(libPath);
  } catch (e) {
    return `Could not load the ZKFinger driver (${libPath}): ${(e as Error).message}. Install the ZKTeco ZKFinger SDK and its runtime dependencies.`;
  }

  const HANDLE = 'void *';
  const init = lib.func('int ZKFPM_Init()');
  const terminate = lib.func('int ZKFPM_Terminate()');
  const deviceCount = lib.func('int ZKFPM_GetDeviceCount()');
  const openDevice = lib.func(`${HANDLE} ZKFPM_OpenDevice(int index)`);
  const closeDevice = lib.func(`int ZKFPM_CloseDevice(${HANDLE} handle)`);
  const getParameters = lib.func(
    `int ZKFPM_GetParameters(${HANDLE} handle, int code, _Inout_ uint8_t *value, _Inout_ uint32_t *size)`,
  );
  // Blocking-ish; run on a koffi worker thread so a slow frame never freezes the UI.
  const acquireFingerprint = lib
    .func(
      `int ZKFPM_AcquireFingerprint(${HANDLE} handle, _Out_ uint8_t *image, uint32_t imageSize, _Out_ uint8_t *template, _Inout_ uint32_t *size)`,
    )
    .async;

  return {
    init,
    terminate,
    deviceCount,
    openDevice,
    closeDevice,
    getParameter(handle, code) {
      const value = Buffer.alloc(4);
      const size = [4];
      const rc = getParameters(handle, code, value, size);
      return rc === ZKFP_OK ? value.readInt32LE(0) : null;
    },
    acquire(handle, image, template, size) {
      return new Promise((resolve, reject) => {
        acquireFingerprint(
          handle,
          image,
          image.length,
          template,
          size,
          (err: Error | null, rc: number) => (err ? reject(err) : resolve(rc)),
        );
      });
    },
  };
}

/**
 * A packaged Windows build bundles its own copy of libzkfp (see resources/zkfinger/)
 * rather than relying on a system-wide SDK install, so it always has a copy to load
 * regardless of what the search path finds. Dev builds fall back to the system path,
 * matching a developer's own local SDK install.
 */
function defaultLibName(): string {
  if (platform === 'win32' && app.isPackaged) {
    return join(process.resourcesPath, 'zkfinger', 'lib', 'libzkfp.dll');
  }
  return platform === 'win32' ? 'libzkfp.dll' : 'libzkfp.so';
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class ZkFingerReader implements FingerprintReader {
  private zk: ZkfpBinding | null = null;
  private loadError: string | null = null;
  private handle: unknown = null;
  private imageBytes = 0;

  /** Idempotent: load the driver, init the SDK, open device 0. Throws on failure. */
  private ensureOpen(): void {
    if (this.handle) return;

    if (!this.zk && !this.loadError) {
      const bound = bind();
      if (typeof bound === 'string') this.loadError = bound;
      else this.zk = bound;
    }
    if (!this.zk) throw new Error(this.loadError ?? 'ZKFinger driver unavailable');

    if (this.zk.init() !== ZKFP_OK) throw new Error('ZKFinger SDK failed to initialise.');
    if (this.zk.deviceCount() < 1) {
      this.zk.terminate();
      throw new Error('No fingerprint reader detected. Check the USB connection.');
    }
    const handle = this.zk.openDevice(0);
    if (!handle) {
      this.zk.terminate();
      throw new Error('Could not open the fingerprint reader.');
    }
    this.handle = handle;

    const width = this.zk.getParameter(handle, PARAM_IMAGE_WIDTH) ?? 0;
    const height = this.zk.getParameter(handle, PARAM_IMAGE_HEIGHT) ?? 0;
    this.imageBytes = width > 0 && height > 0 ? width * height : 640 * 480;
  }

  async capture(): Promise<CaptureResult> {
    this.ensureOpen();
    const zk = this.zk;
    if (!zk || !this.handle) throw new Error('ZKFinger driver unavailable');

    const image = Buffer.alloc(this.imageBytes);
    const template = Buffer.alloc(TEMPLATE_MAX);
    const deadline = Date.now() + CAPTURE_TIMEOUT_MS;

    for (;;) {
      const size = [TEMPLATE_MAX];
      const rc = await zk.acquire(this.handle, image, template, size);
      if (rc === ZKFP_OK) {
        return {
          template: template.subarray(0, size[0]).toString('base64'),
          // AcquireFingerprint only yields a template once the SDK's own quality gate
          // passes, so a successful read is reported at a nominal high score.
          quality: 88,
          simulated: false,
        };
      }
      if (Date.now() > deadline) {
        throw new Error('No finger detected. Ask the student to place their finger and try again.');
      }
      await delay(POLL_INTERVAL_MS);
    }
  }

  async status(): Promise<ReaderStatus> {
    try {
      this.ensureOpen();
      return { connected: true, simulated: false, deviceName: 'ZKTeco fingerprint reader', message: null };
    } catch (e) {
      return { connected: false, simulated: false, deviceName: null, message: (e as Error).message };
    }
  }

  async dispose(): Promise<void> {
    if (this.zk && this.handle) {
      try {
        this.zk.closeDevice(this.handle);
        this.zk.terminate();
      } catch {
        // best effort on shutdown
      }
    }
    this.handle = null;
  }
}
