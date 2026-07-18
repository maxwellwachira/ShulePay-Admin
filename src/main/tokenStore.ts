import { safeStorage, app } from 'electron';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Access-token storage encrypted at rest with the OS keychain (Keychain / DPAPI /
 * libsecret) via Electron's safeStorage. The token NEVER goes to the renderer or
 * localStorage — the renderer asks the main process to attach it to requests.
 */
const tokenFile = (): string => join(app.getPath('userData'), 'auth.bin');

export function setToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is not available');
  }
  writeFileSync(tokenFile(), safeStorage.encryptString(token));
}

export function getToken(): string | null {
  const file = tokenFile();
  if (!existsSync(file)) return null;
  try {
    return safeStorage.decryptString(readFileSync(file));
  } catch {
    return null;
  }
}

export function clearToken(): void {
  const file = tokenFile();
  if (existsSync(file)) rmSync(file);
}
