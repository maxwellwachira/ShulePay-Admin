import type { TerminalIdentity } from '@shared/bridge';
import { apiRequest } from './api';
import { setTerminal } from './terminalStore';

/**
 * Turn this device into a till, in one step, without the key ever entering the
 * renderer: main registers the terminal with the signed-in admin's token, then writes
 * the returned key straight to encrypted storage.
 *
 * The backend shows a terminal's key exactly once, so this is also the only moment it
 * can be captured — losing it means registering a fresh terminal.
 */
export async function pairTerminal(orgId: string, label: string): Promise<TerminalIdentity> {
  const res = await apiRequest({
    path: `/v1/orgs/${orgId}/terminals`,
    method: 'POST',
    body: { label },
  });

  if (!res.ok) {
    const data = res.data as { error?: { message?: string } };
    throw new Error(data?.error?.message ?? 'Could not register this device as a till.');
  }

  const terminal = res.data as { id?: string; label?: string; apiKey?: string };
  if (!terminal.id || !terminal.apiKey) {
    throw new Error('The server did not return a terminal key.');
  }

  setTerminal({
    id: terminal.id,
    label: terminal.label ?? label,
    orgId,
    apiKey: terminal.apiKey,
  });
  return { id: terminal.id, label: terminal.label ?? label, orgId };
}
