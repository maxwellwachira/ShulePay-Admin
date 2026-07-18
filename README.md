# ShulePay Admin (Desktop)

Desktop app for the onboarding/customer-care desk: create students, enroll fingerprints
on the reader, and view balances. Talks to the [ShulePay backend](../shulepay).

Electron + React + TypeScript, built with **electron-vite**.

## Security posture (Electron hardening)

- **`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`** — the renderer
  is a plain web page with no Node/Electron access.
- The renderer reaches the OS only through a **minimal, typed preload bridge**
  (`window.shulepay`) defined once in [`src/shared/bridge.ts`](src/shared/bridge.ts).
- The **access token lives in the OS keychain** (Electron `safeStorage`) in the main
  process — never in the renderer, JS state, or `localStorage`.
- The **fingerprint reader** runs in the **main process** (native/USB access) behind a
  device seam ([`src/main/device/fingerprint.ts`](src/main/device/fingerprint.ts));
  the renderer only ever receives a template + quality score. Swap the stub for the
  vendor SDK.
- A **Content-Security-Policy** restricts what the renderer can load/connect to.

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
cp .env.example .env          # SHULEPAY_API_URL -> your backend
npm run dev                   # launch the app (backend should be running)
```

Sign in with an admin created on the backend
(`npm run admin:create -- <phone> <password>` there), then onboard a student and enroll
a fingerprint (the reader is stubbed until hardware + SDK are wired).

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Launch with HMR |
| `npm run build` | Typecheck + build the production app |
| `npm run typecheck` | Type-check main+preload and renderer separately |
| `npm run lint` | Lint |
