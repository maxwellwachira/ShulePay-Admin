import { ipcMain } from 'electron';
import {
  IPC,
  type AppConfig,
  type ApiRequest,
  type ReaderStatus,
  type TerminalIdentity,
} from '@shared/bridge';
import { setToken, getToken, clearToken } from './tokenStore';
import { getTerminalIdentity, clearTerminal } from './terminalStore';
import { pairTerminal } from './pairing';
import { fingerprintReader } from './device/fingerprint';
import { apiRequest } from './api';

/**
 * Registers the privileged handlers the renderer may invoke. This is the whole trust
 * boundary - nothing else in the main process is reachable from the UI. Handlers
 * validate their inputs and keep secrets (the token) in the main process.
 */
export function registerIpc(): void {
  ipcMain.handle(IPC.apiRequest, (_e, req: ApiRequest) => apiRequest(req));

  ipcMain.handle(IPC.authSetToken, (_e, token: unknown) => {
    if (typeof token !== 'string' || token.length === 0) throw new Error('invalid token');
    setToken(token);
  });
  ipcMain.handle(IPC.authGetToken, () => getToken());
  ipcMain.handle(IPC.authClear, () => clearToken());

  ipcMain.handle(IPC.terminalIdentity, (): TerminalIdentity | null => getTerminalIdentity());
  ipcMain.handle(IPC.terminalPair, (_e, orgId: unknown, label: unknown) => {
    if (typeof orgId !== 'string' || typeof label !== 'string' || label.trim().length === 0) {
      throw new Error('invalid pairing request');
    }
    return pairTerminal(orgId, label.trim());
  });
  ipcMain.handle(IPC.terminalUnpair, () => clearTerminal());

  ipcMain.handle(IPC.fingerprintCapture, () => fingerprintReader.capture());
  ipcMain.handle(IPC.fingerprintStatus, (): Promise<ReaderStatus> => fingerprintReader.status());

  ipcMain.handle(IPC.appGetConfig, (): AppConfig => ({
    apiBaseUrl: process.env.THUMBPAY_API_URL ?? 'http://localhost:3000',
  }));
}
