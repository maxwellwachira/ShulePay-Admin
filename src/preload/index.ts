import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type ThumbPayBridge } from '@shared/bridge';

/**
 * The preload runs in an isolated context and is the ONLY code that can talk to both
 * Electron and the page. It exposes a small, typed API on `window.thumbpay` - no raw
 * ipcRenderer, no Node - so the renderer can never reach anything not listed here.
 */
const bridge: ThumbPayBridge = {
  api: {
    request: (req) => ipcRenderer.invoke(IPC.apiRequest, req),
  },
  auth: {
    setToken: (token) => ipcRenderer.invoke(IPC.authSetToken, token),
    getToken: () => ipcRenderer.invoke(IPC.authGetToken),
    clear: () => ipcRenderer.invoke(IPC.authClear),
  },
  terminal: {
    identity: () => ipcRenderer.invoke(IPC.terminalIdentity),
    pair: (orgId, label) => ipcRenderer.invoke(IPC.terminalPair, orgId, label),
    unpair: () => ipcRenderer.invoke(IPC.terminalUnpair),
  },
  fingerprint: {
    capture: () => ipcRenderer.invoke(IPC.fingerprintCapture),
    status: () => ipcRenderer.invoke(IPC.fingerprintStatus),
  },
  app: {
    getConfig: () => ipcRenderer.invoke(IPC.appGetConfig),
  },
};

contextBridge.exposeInMainWorld('thumbpay', bridge);
