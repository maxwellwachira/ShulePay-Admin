import type { ShulePayBridge } from '@shared/bridge';

declare global {
  interface Window {
    shulepay: ShulePayBridge;
  }
}

export {};
