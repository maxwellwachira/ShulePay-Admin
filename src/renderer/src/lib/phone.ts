/**
 * Kenyan phone helpers. The backend normalizes too — this is only so a cashier finds
 * out about a typo before an M-Pesa prompt is sent, not after.
 */

/** Normalize a Kenyan phone number to 254XXXXXXXXX, or return null if invalid. */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-+()]/g, '');
  if (/^0[17]\d{8}$/.test(s)) return `254${s.slice(1)}`;
  if (/^254[17]\d{8}$/.test(s)) return s;
  if (/^[17]\d{8}$/.test(s)) return `254${s}`;
  return null;
}

/** 254712345678 -> "0712 345 678" — how a Kenyan reads their own number back. */
export function formatPhone(phone: string): string {
  const m = /^254(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone;
}
