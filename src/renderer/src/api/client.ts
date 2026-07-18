/** Typed client for the ShulePay backend. Requests are performed by the MAIN process
 * (via the bridge) — no browser CORS, and the token is injected there, never held in
 * the renderer. */

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
  const res = await window.shulepay.api.request({
    path,
    ...(opts.method ? { method: opts.method } : {}),
    ...(opts.body !== undefined ? { body: opts.body } : {}),
    ...(opts.auth !== undefined ? { auth: opts.auth } : {}),
  });
  const data = res.data as { error?: { code?: string; message?: string } };
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Request failed');
  }
  return res.data as T;
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
