// Continuous smoke test for the fingerprint device seam — repeatedly captures and prints
// results until interrupted (Ctrl+C). No Electron window, no IPC, no login.
// Run with: npx tsx scripts/test-fingerprint-loop.ts
import { fingerprintReader } from '../src/main/device/fingerprint';

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});

function timestamp(): string {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

async function main(): Promise<void> {
  console.log(`platform: ${process.platform}`);
  console.log(`THUMBPAY_FORCE_SIMULATED_READER=${process.env.THUMBPAY_FORCE_SIMULATED_READER ?? '(unset)'}`);
  console.log(`THUMBPAY_ZKFINGER_LIB=${process.env.THUMBPAY_ZKFINGER_LIB ?? '(unset)'}`);

  const status = await fingerprintReader.status();
  console.log('\n--- status() ---');
  console.log(status);
  if (!status.connected) {
    console.log('\nReader not connected — fix the reason above and rerun.');
    return;
  }

  console.log('\nLooping capture() — place/lift your finger repeatedly. Ctrl+C to stop.\n');

  let n = 0;
  let ok = 0;
  let failed = 0;
  while (!stopping) {
    n += 1;
    try {
      const result = await fingerprintReader.capture();
      ok += 1;
      console.log(
        `[${timestamp()}] #${n} OK   quality=${result.quality} simulated=${result.simulated} templateBytes=${Buffer.from(result.template, 'base64').length}`,
      );
    } catch (e) {
      failed += 1;
      console.log(`[${timestamp()}] #${n} FAIL ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\nStopped. ${ok} ok, ${failed} failed, ${n} total.`);
  await fingerprintReader.dispose();
}

main().catch((e) => {
  console.error('\nFAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
