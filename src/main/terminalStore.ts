import { safeStorage, app } from 'electron';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { TerminalIdentity } from '@shared/bridge';

/**
 * This device's POS terminal credential, encrypted at rest with the OS keychain — the
 * same treatment as the user's access token.
 *
 * The key is deliberately harder to reach than the access token: the renderer has no
 * way to read it back at all. It is minted in the main process at pairing time and
 * only ever leaves as an `X-Terminal-Key` header. A cashier with devtools open cannot
 * copy the till's credential onto another machine.
 *
 * The key outlives the user's session on purpose: it identifies the DEVICE, not the
 * person, so signing out at the end of a shift must not un-pair the till.
 */
interface StoredTerminal extends TerminalIdentity {
  apiKey: string;
}

const terminalFile = (): string => join(app.getPath('userData'), 'terminal.bin');

function read(): StoredTerminal | null {
  const file = terminalFile();
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(safeStorage.decryptString(readFileSync(file))) as StoredTerminal;
  } catch {
    return null;
  }
}

export function setTerminal(terminal: StoredTerminal): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is not available');
  }
  writeFileSync(terminalFile(), safeStorage.encryptString(JSON.stringify(terminal)));
}

/** The key itself — main-process only, for attaching to POS requests. */
export function getTerminalKey(): string | null {
  return read()?.apiKey ?? null;
}

/** What the UI is allowed to know: which till this is, never how to be it. */
export function getTerminalIdentity(): TerminalIdentity | null {
  const stored = read();
  return stored ? { id: stored.id, label: stored.label, orgId: stored.orgId } : null;
}

export function clearTerminal(): void {
  const file = terminalFile();
  if (existsSync(file)) rmSync(file);
}
