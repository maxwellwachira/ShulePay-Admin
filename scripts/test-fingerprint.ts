// Standalone smoke test for the fingerprint device seam — no Electron window, no IPC,
// no login. Run with: npx tsx scripts/test-fingerprint.ts
import { fingerprintReader } from '../src/main/device/fingerprint';

async function main(): Promise<void> {
  console.log(`platform: ${process.platform}`);
  console.log(`THUMBPAY_FORCE_SIMULATED_READER=${process.env.THUMBPAY_FORCE_SIMULATED_READER ?? '(unset)'}`);
  console.log(`THUMBPAY_ZKFINGER_LIB=${process.env.THUMBPAY_ZKFINGER_LIB ?? '(unset)'}`);

  console.log('\n--- status() ---');
  const status = await fingerprintReader.status();
  console.log(status);

  if (!status.connected) {
    console.log('\nReader not connected — skipping capture(). Fix the reason above and rerun.');
    await fingerprintReader.dispose();
    return;
  }

  console.log('\n--- capture() --- place a finger on the sensor now...');
  const result = await fingerprintReader.capture();
  console.log({
    quality: result.quality,
    simulated: result.simulated,
    templateBytes: Buffer.from(result.template, 'base64').length,
  });

  await fingerprintReader.dispose();
}

main().catch((e) => {
  console.error('\nFAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
