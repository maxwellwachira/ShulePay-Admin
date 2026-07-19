import type { ApiRequest, ApiResponse } from '@shared/bridge';
import { getToken } from './tokenStore';

/**
 * Backend HTTP from the main process. No browser/CORS constraints, and the bearer
 * token is read from the OS keychain here and attached - the renderer never sees it.
 *
 * Failures never reject the IPC promise: network errors and timeouts are mapped to a
 * structured { ok: false, status: 0 } response so the renderer can show a friendly
 * offline message instead of an opaque IPC error.
 */
const baseUrl = (): string => process.env.SHULEPAY_API_URL ?? 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 20_000;

export async function apiRequest(req: ApiRequest): Promise<ApiResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  try {
    const res = await fetch(`${baseUrl()}${req.path}`, {
      method: req.method ?? 'GET',
      headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    return {
      ok: false,
      status: 0,
      data: {
        error: {
          code: timedOut ? 'timeout' : 'network',
          message: timedOut
            ? 'The server took too long to respond. Try again.'
            : 'Could not reach the ShulePay server. Check your internet connection.',
        },
      },
    };
  }
}
