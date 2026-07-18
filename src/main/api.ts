import type { ApiRequest, ApiResponse } from '@shared/bridge';
import { getToken } from './tokenStore';

/**
 * Backend HTTP from the main process. No browser/CORS constraints, and the bearer
 * token is read from the OS keychain here and attached — the renderer never sees it.
 */
const baseUrl = (): string => process.env.SHULEPAY_API_URL ?? 'http://localhost:3000';

export async function apiRequest(req: ApiRequest): Promise<ApiResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${baseUrl()}${req.path}`, {
    method: req.method ?? 'GET',
    headers,
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
