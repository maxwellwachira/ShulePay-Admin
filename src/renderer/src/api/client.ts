import type { AppConfig } from '@shared/bridge';

/** Typed client for the ShulePay backend. The bearer token is fetched from the main
 * process (OS keychain) per request — the renderer never holds it in JS state or
 * localStorage. */

let cachedConfig: AppConfig | null = null;
async function baseUrl(): Promise<string> {
  cachedConfig ??= await window.shulepay.app.getConfig();
  return cachedConfig.apiBaseUrl;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // default true
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false) {
    const token = await window.shulepay.auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${await baseUrl()}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  if (!res.ok) {
    throw new ApiError(res.status, data.error?.code ?? 'error', data.error?.message ?? res.statusText);
  }
  return data as T;
}

export interface LoginResponse {
  accessToken: string;
  user: { id: string; role: string; name: string | null };
}

export const api = {
  login: (phone: string, password: string) =>
    request<LoginResponse>('/v1/auth/login', { method: 'POST', body: { phone, password }, auth: false }),

  onboardMember: (orgId: string, body: { externalRef: string; name: string }) =>
    request<{ id: string; accountNumber: string; name: string; walletAccountId: string }>(
      `/v1/orgs/${orgId}/members`,
      { method: 'POST', body },
    ),

  enrollFingerprint: (
    memberId: string,
    body: { fingerIndex: number; template: string; quality: number; consent: boolean; consentVersion: string },
  ) =>
    request<{ id: string; memberId: string; fingerIndex: number }>(
      `/v1/members/${memberId}/biometrics`,
      { method: 'POST', body },
    ),

  balance: (memberId: string) =>
    request<{ memberId: string; balanceCents: number; balanceKes: string }>(
      `/v1/members/${memberId}/balance`,
    ),
};
