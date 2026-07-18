import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type ShulePayBridge } from '@shared/bridge';

/**
 * The preload runs in an isolated context and is the ONLY code that can talk to both
 * Electron and the page. It exposes a small, typed API on `window.shulepay` — no raw
 * ipcRenderer, no Node — so the renderer can never reach anything not listed here.
 */
const bridge: ShulePayBridge = {
  api: {
    request: (req) => ipcRenderer.invoke(IPC.apiRequest, req),
  },
  auth: {
    setToken: (token) => ipcRenderer.invoke(IPC.authSetToken, token),
    getToken: () => ipcRenderer.invoke(IPC.authGetToken),
    clear: () => ipcRenderer.invoke(IPC.authClear),
  },
  fingerprint: {
    capture: () => ipcRenderer.invoke(IPC.fingerprintCapture),
  },
  app: {
    getConfig: () => ipcRenderer.invoke(IPC.appGetConfig),
  },
};

contextBridge.exposeInMainWorld('shulepay', bridge);
