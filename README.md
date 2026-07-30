# ThumbPay Admin (Desktop)

Desktop app for the onboarding/customer-care desk: create students, enroll fingerprints
on the reader, and view balances. Talks to the [ThumbPay backend](../thumbpay).

Electron + React + TypeScript, built with **electron-vite**.

## Security posture (Electron hardening)

- **`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`** — the renderer
  is a plain web page with no Node/Electron access.
- The renderer reaches the OS only through a **minimal, typed preload bridge**
  (`window.thumbpay`) defined once in [`src/shared/bridge.ts`](src/shared/bridge.ts).
- The **access token lives in the OS keychain** (Electron `safeStorage`) in the main
  process — never in the renderer, JS state, or `localStorage`.
- The **fingerprint reader** runs in the **main process** (native/USB access) behind a
  device seam ([`src/main/device/fingerprint.ts`](src/main/device/fingerprint.ts));
  the renderer only ever receives a template + quality score, never a raw image.
- A **Content-Security-Policy** restricts what the renderer can load/connect to.

## Fingerprint reader (ZKTeco ZK9500)

The device seam picks a reader per platform:

| Platform | Reader | Notes |
| --- | --- | --- |
| Windows | Real ([`zkfinger.ts`](src/main/device/zkfinger.ts)) | ZKFinger SDK `libzkfp.dll` |
| Linux | Real ([`zkfinger.ts`](src/main/device/zkfinger.ts)) | ZKFinger SDK `libzkfp.so` (put its folder on `LD_LIBRARY_PATH`) |
| macOS | Simulated ([`stub.ts`](src/main/device/stub.ts)) | ZKTeco ships no macOS driver — captures are fabricated so the UI is still testable |

The real reader binds the vendor `libzkfp` C API through **koffi** (an FFI with
ABI-stable N-API prebuilds, so it loads under Electron with no native rebuild). Install
ZKTeco's **ZKFinger Reader SDK** on the target machine; if the library isn't on the
system search path, point `THUMBPAY_ZKFINGER_LIB` at it (see [`.env.example`](.env.example)).
When the driver or device is missing, `fingerprint.status()` reports `connected: false`
with a reason instead of crashing. Set `THUMBPAY_FORCE_SIMULATED_READER=1` to force the
stub on any platform.

> The `libzkfp` FFI signatures in `zkfinger.ts` follow ZKFinger's documented C API but
> have **not** been run against physical hardware in this repo — verify capture on a real
> ZK9500 as the first on-device test.

**Enrollment (this app):** [`Onboard.tsx`](src/renderer/src/pages/Onboard.tsx) captures a
template and posts it to `POST /v1/members/:memberId/biometrics` (admin-authenticated) —
matches the backend contract exactly.

**Payment authorization (the till, not this app):** verified against the backend, the POS
routes are **terminal-authenticated** (terminal API key, not the admin token), so they
live in the future till app rather than this admin client:

- `POST /v1/pos/identify` — body `{ fingerprintTemplate }` (base64) → `{ memberId, accountNumber, name, score }`; `404 no_biometric_match` or `422 ambiguous_biometric` otherwise. Confirms who the finger belongs to before ringing up.
- `POST /v1/pos/purchases` — body `{ fingerprintTemplate | accountNumber, amountCents, idempotencyKey }` → matches (1:N) and authorizes the charge atomically.

The **backend** does the 1:N match (scoped, with a threshold + separation margin;
templates stay server-side). This repo's reusable building block for that flow is the
device **`capture()`** — the same call feeds enrollment here and verify at the till.

> ⚠️ **Backend matcher is still a byte-exact stub** ([`../thumbpay` `matcher.ts`](../thumbpay/src/modules/biometric/matcher.ts)):
> it only matches identical template bytes. Two real scans of the same finger differ, so
> real-hardware payment auth needs a **vendor (ZKFinger) matcher swapped into the backend**
> `matcher.ts` first. Enrollment works today; end-to-end verify does not until that lands.

## Layout

```
src/
  main/        Electron main process (Node): window, IPC handlers, token store, device
  preload/     the typed contextBridge — the entire renderer trust boundary
  renderer/    the React UI (no Node access)
    src/api/   typed backend client (bearer token fetched from main per request)
    src/auth/  auth context
    src/pages/ Login, Dashboard, OnboardStudent (with fingerprint capture)
  shared/      IPC contract + types shared across all three
```

## Getting started

```bash
npm install
cp .env.example .env          # THUMBPAY_API_URL -> your backend
npm run dev                   # launch the app (backend should be running)
```

Sign in with an admin created on the backend
(`npm run admin:create -- <phone> <password>` there), then onboard a student and enroll
a fingerprint. On macOS (or with `THUMBPAY_FORCE_SIMULATED_READER=1`) the reader is
simulated; on Windows/Linux with the ZKFinger SDK installed it uses the real ZK9500.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Launch with HMR |
| `npm run build` | Typecheck + build the production app |
| `npm run typecheck` | Type-check main+preload and renderer separately |
| `npm run lint` | Lint |
