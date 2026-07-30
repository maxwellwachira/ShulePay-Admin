/**
 * Fingerprint reader probe — drives the SAME device code the Electron main process uses
 * ([src/main/device/fingerprint.ts]) without launching the app or the backend. Use it to
 * verify a machine's reader before deploying the till.
 *
 *   npx tsx scripts/test-reader.ts
 *
 * macOS                    → simulated reader (ZKTeco ships no macOS driver).
 * Windows/Linux + ZK9500   → real captures via the ZKFinger SDK. If the driver isn't on
 *                            the system path, set THUMBPAY_ZKFINGER_LIB first.
 */
import { fingerprintReader } from '../src/main/device/fingerprint';

async function main(): Promise<void> {
  console.log('platform:', process.platform, process.arch);
  console.log('status  :', await fingerprintReader.status());

  console.log('\nCapturing (place a finger if this is real hardware)…');
  const t0 = Date.now();
  const cap = await fingerprintReader.capture();
  console.log(`captured in ${Date.now() - t0}ms  simulated=${cap.simulated}  quality=${cap.quality}`);
  console.log('template:', `${cap.template.slice(0, 32)}… (${cap.template.length} b64 chars)`);

  const cap2 = await fingerprintReader.capture();
  console.log('two captures differ:', cap.template !== cap2.template);

  await fingerprintReader.dispose();
  console.log('disposed cleanly ✓');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
