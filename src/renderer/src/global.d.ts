import type { ThumbPayBridge } from '@shared/bridge';

declare global {
  interface Window {
    thumbpay: ThumbPayBridge;
  }
}

export {};
