import { ApiError } from '@renderer/api/client';

/**
 * What the cashier should do next. A till failure is never just "error" — there is
 * always a next action, and a queue of hungry students waiting for it.
 */
export type Recovery =
  | 'retry_scan' // the finger didn't read — try the reader again
  | 'use_account' // biometrics won't resolve this student; type the account number
  | 'retry_charge' // transient; safe to send the same sale again
  | 'refresh_catalog' // the price list moved under us
  | 'edit_cart' // the sale itself is the problem (too expensive, over limit)
  | 'pair_device' // this machine isn't a till yet
  | 'call_office'; // not the cashier's problem to fix

export interface SaleFailure {
  title: string;
  detail: string;
  recovery: Recovery;
}

/**
 * Map a backend error code to something a cashier can act on without knowing what a
 * "422" is. Wording is deliberately blame-free about the student — these messages get
 * read aloud across a counter.
 */
export function describeFailure(err: unknown): SaleFailure {
  if (!(err instanceof ApiError)) {
    return {
      title: 'Something went wrong',
      detail: 'The sale did not go through. Try charging again.',
      recovery: 'retry_charge',
    };
  }

  switch (err.code) {
    case 'no_biometric_match':
      return {
        title: 'Finger not recognised',
        detail:
          'Ask them to press flat on the reader and hold still, then scan again. If it still fails, use their account number.',
        recovery: 'retry_scan',
      };
    case 'ambiguous_biometric':
      return {
        title: 'Could not tell two students apart',
        detail: 'To be safe, nobody was charged. Use the account number for this sale.',
        recovery: 'use_account',
      };
    case 'unknown_student':
      return {
        title: 'No student with that account number',
        detail: 'Check the digits and try again.',
        recovery: 'use_account',
      };
    case 'insufficient_funds':
      return {
        title: 'Not enough balance',
        detail:
          'Their wallet cannot cover this sale. Remove an item, or ask them to have their parent top up.',
        recovery: 'edit_cart',
      };
    case 'limit_exceeded':
      return {
        title: 'Spending limit reached',
        detail:
          'This student has hit the limit their parent set. Nothing was charged — the office can adjust it.',
        recovery: 'edit_cart',
      };
    case 'account_inactive':
      return {
        title: 'Account is blocked',
        detail: 'This wallet is not active. Send them to the office — nothing was charged.',
        recovery: 'call_office',
      };
    case 'price_mismatch':
    case 'unknown_product':
      return {
        title: 'The price list changed',
        detail: `${err.message} Nothing was charged.`,
        recovery: 'refresh_catalog',
      };
    case 'missing_terminal_key':
    case 'invalid_terminal_key':
      return {
        title: 'This device is not a till',
        detail:
          'Its terminal key is missing or was revoked, so it cannot take payments until it is paired again.',
        recovery: 'pair_device',
      };
    case 'idempotency_conflict':
      return {
        title: 'That sale reference was already used',
        detail: 'Start the sale again to get a fresh one. Nothing was charged.',
        recovery: 'edit_cart',
      };
    case 'rate_limited':
      return {
        title: 'Too many attempts',
        detail: 'Wait a few seconds, then charge again.',
        recovery: 'retry_charge',
      };
    case 'timeout':
    case 'network':
      return {
        title: 'Could not reach the server',
        detail:
          'Check the connection and press Retry. It is safe — this sale can only ever be charged once, no matter how many times you retry it.',
        recovery: 'retry_charge',
      };
    default:
      return {
        title: 'Sale failed',
        detail: err.message,
        recovery: 'retry_charge',
      };
  }
}
