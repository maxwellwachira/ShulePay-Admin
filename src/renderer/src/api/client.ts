/** Typed client for the ShulePay backend. Requests are performed by the MAIN process
 * (via the bridge) - no browser CORS, and the token is injected there, never held in
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
  auth?: boolean | 'terminal'; // default true (the signed-in user's bearer token)
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
    // Only a USER 401 means the session died. A terminal 401 means this device isn't
    // paired (or its key was revoked) — signing the cashier out over that would be
    // both wrong and maddening mid-queue.
    if (res.status === 401 && opts.auth !== false && opts.auth !== 'terminal') onUnauthorized?.();
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

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  priceKes: string;
  category: string | null;
  status: 'active' | 'archived';
  sortOrder: number;
}

/** What a till sends up: what was tapped, never what it costs. */
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface IdentifiedStudent {
  memberId: string;
  accountNumber: string;
  name: string;
  score: number;
}

export interface PurchaseResult {
  status: string;
  idempotent: boolean;
  memberId: string;
  balanceCents: number;
  balanceKes: string;
  reference?: string;
  items?: { productId: string; name: string; quantity: number; lineTotalCents: number }[];
}

export interface PurchaseInput {
  amountCents: number;
  idempotencyKey: string;
  items?: CartLine[];
  reference?: string;
  // Exactly one of these identifies the student.
  fingerprintTemplate?: string;
  accountNumber?: string;
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

  /** Just the wallet balance — used by the till to preview a charge before it happens. */
  memberBalance: (memberId: string) =>
    request<{ memberId: string; balanceCents: number; balanceKes: string }>(
      `/v1/members/${memberId}/balance`,
    ),

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

  // --- Catalog (admin-authenticated) ---

  listProducts: (orgId: string, includeArchived = false) =>
    request<{ products: Product[] }>(
      `/v1/orgs/${orgId}/products${includeArchived ? '?includeArchived=true' : ''}`,
    ),

  createProduct: (
    orgId: string,
    body: { name: string; priceCents: number; category?: string | null; sortOrder?: number },
  ) => request<Product>(`/v1/orgs/${orgId}/products`, { method: 'POST', body }),

  updateProduct: (
    orgId: string,
    productId: string,
    patch: {
      name?: string;
      priceCents?: number;
      category?: string | null;
      status?: 'active' | 'archived';
      sortOrder?: number;
    },
  ) =>
    request<Product>(`/v1/orgs/${orgId}/products/${productId}`, {
      method: 'PATCH',
      body: patch,
    }),
};

/**
 * Selling. These routes authenticate the DEVICE (`X-Terminal-Key`), not the signed-in
 * user, so they only work once this machine has been paired as a till — the main
 * process holds the key and attaches it; it never reaches this code.
 */
export const pos = {
  /** The till's own copy of the price list, so a shift can start without an admin. */
  catalog: () => request<{ products: Product[] }>('/v1/pos/catalog', { auth: 'terminal' }),

  /** Resolve a fingerprint to a student so the cashier can confirm before charging. */
  identify: (fingerprintTemplate: string) =>
    request<IdentifiedStudent>('/v1/pos/identify', {
      method: 'POST',
      body: { fingerprintTemplate },
      auth: 'terminal',
    }),

  /**
   * Charge the sale. `idempotencyKey` must be minted ONCE per sale and reused across
   * retries: that is what makes a timed-out request safe to send again.
   */
  purchase: (body: PurchaseInput) =>
    request<PurchaseResult>('/v1/pos/purchases', {
      method: 'POST',
      body,
      auth: 'terminal',
    }),
};

/** Format integer cents as "KES 1,234.50". */
export function formatKes(cents: number): string {
  return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
