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

// When an authenticated request returns 401 (e.g. the token expired), the app signs
// the user out. AuthProvider registers this handler.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
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
    if (res.status === 401 && opts.auth !== false) onUnauthorized?.();
    throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Request failed');
  }
  return res.data as T;
}

export interface LoginResponse {
  accessToken: string;
  user: { id: string; role: string; name: string | null };
}

export interface Me {
  id: string;
  role: string;
  name: string | null;
  phone: string;
  orgId: string | null;
  org: { id: string; name: string } | null;
}

export interface StudentSummary {
  id: string;
  accountNumber: string;
  name: string;
  status: string;
  balanceCents: number;
}

export interface OrgTxn {
  id: string;
  kind: string;
  createdAt: string;
  reference: string | null;
  memberName: string;
  accountNumber: string;
  amountCents: number;
}

export interface OnboardInput {
  externalRef: string;
  name: string;
  guardianPhone?: string;
  guardianName?: string;
}

export interface MemberDetail {
  id: string;
  accountNumber: string;
  name: string;
  status: string;
  balanceCents: number;
  limits: { period: string; capCents: number }[];
  guardians: { name: string | null; phone: string }[];
}

export interface StaffMember {
  id: string;
  name: string | null;
  phone: string;
  role: string;
  createdAt: string;
}

export interface Terminal {
  id: string;
  label: string;
  status: string;
  createdAt: string;
}

export const api = {
  login: (phone: string, password: string) =>
    request<LoginResponse>('/v1/auth/login', { method: 'POST', body: { phone, password }, auth: false }),

  me: () => request<Me>('/v1/me'),

  listStudents: (orgId: string) =>
    request<{ count: number; members: StudentSummary[] }>(`/v1/orgs/${orgId}/members`),

  transactions: (orgId: string) =>
    request<{ transactions: OrgTxn[] }>(`/v1/orgs/${orgId}/transactions`),

  onboardMember: (orgId: string, body: OnboardInput) =>
    request<{ id: string; accountNumber: string; name: string; guardianUserId: string | null }>(
      `/v1/orgs/${orgId}/members`,
      { method: 'POST', body },
    ),

  memberDetail: (memberId: string) => request<MemberDetail>(`/v1/members/${memberId}`),

  setLimit: (memberId: string, period: 'daily' | 'weekly', capCents: number) =>
    request<{ memberId: string; period: string; capCents: number }>(
      `/v1/members/${memberId}/limits`,
      { method: 'PUT', body: { period, capCents } },
    ),

  listStaff: (orgId: string) => request<{ users: StaffMember[] }>(`/v1/orgs/${orgId}/users`),

  createUser: (orgId: string, body: { phone: string; name: string; password: string; role: 'admin' | 'cashier' }) =>
    request<{ id: string; phone: string; name: string; role: string }>(
      `/v1/orgs/${orgId}/users`,
      { method: 'POST', body },
    ),

  listTerminals: (orgId: string) => request<{ terminals: Terminal[] }>(`/v1/orgs/${orgId}/terminals`),

  registerTerminal: (orgId: string, label: string) =>
    request<{ id: string; label: string; apiKey: string }>(`/v1/orgs/${orgId}/terminals`, {
      method: 'POST',
      body: { label },
    }),

  enrollFingerprint: (
    memberId: string,
    body: { fingerIndex: number; template: string; quality: number; consent: boolean; consentVersion: string },
  ) =>
    request<{ id: string; memberId: string; fingerIndex: number }>(
      `/v1/members/${memberId}/biometrics`,
      { method: 'POST', body },
    ),
};

/** Format integer cents as "KES 1,234.50". */
export function formatKes(cents: number): string {
  return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
