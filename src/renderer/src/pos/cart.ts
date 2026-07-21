import type { CartLine, Product } from '@renderer/api/client';

/** A cart line as the till renders it: the product, plus how many were tapped. */
export interface CartEntry {
  product: Product;
  quantity: number;
}

export type CartAction =
  | { type: 'add'; product: Product }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

/** Nobody buys 100 mandazi in one sale; a stuck key shouldn't be able to claim they did. */
const MAX_QUANTITY = 99;

const clamp = (n: number): number => Math.max(0, Math.min(MAX_QUANTITY, n));

/**
 * Cart state. Tapping the same item twice bumps its quantity rather than adding a
 * second line — the cashier's mental model is "three chapatis", not "chapati, chapati,
 * chapati", and it keeps the receipt short.
 */
export function cartReducer(state: CartEntry[], action: CartAction): CartEntry[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((e) => e.product.id === action.product.id);
      if (!existing) return [...state, { product: action.product, quantity: 1 }];
      return state.map((e) =>
        e.product.id === action.product.id ? { ...e, quantity: clamp(e.quantity + 1) } : e,
      );
    }
    case 'setQuantity': {
      const quantity = clamp(action.quantity);
      // Stepping down to zero is how a cashier removes a mis-tap.
      if (quantity === 0) return state.filter((e) => e.product.id !== action.productId);
      return state.map((e) => (e.product.id === action.productId ? { ...e, quantity } : e));
    }
    case 'remove':
      return state.filter((e) => e.product.id !== action.productId);
    case 'clear':
      return [];
  }
}

export function cartTotal(entries: readonly CartEntry[]): number {
  return entries.reduce((sum, e) => sum + e.product.priceCents * e.quantity, 0);
}

export function cartCount(entries: readonly CartEntry[]): number {
  return entries.reduce((sum, e) => sum + e.quantity, 0);
}

/** The wire form: ids and quantities only — the server does the pricing. */
export function toCartLines(entries: readonly CartEntry[]): CartLine[] {
  return entries.map((e) => ({ productId: e.product.id, quantity: e.quantity }));
}
