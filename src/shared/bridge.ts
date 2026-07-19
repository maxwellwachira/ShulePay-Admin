/**
 * The typed contract for the ONLY surface the renderer can touch in the main process.
 * Shared by main (implements), preload (exposes via contextBridge), and renderer
 * (consumes as `window.shulepay`). Keep it minimal - every method here is privileged.
 */

export interface CaptureResult {
  template: string; // base64 fingerprint template (never a raw image)
  quality: number; // 0..100
}

export interface AppConfig {
  apiBaseUrl: string;
}

export interface ApiRequest {
  path: string;
  method?: string;
  body?: unknown;
  auth?: boolean; // default true; main injects the bearer token
}
export interface ApiResponse {
  ok: boolean;
  status: number;
  data: unknown;
}

export interface ShulePayBridge {
  /**
   * All backend HTTP goes through the MAIN process (Node) - no browser CORS, and the
   * token is injected in main so it never reaches the renderer.
   */
  api: {
    request(req: ApiRequest): Promise<ApiResponse>;
  };
  /** Access token lives in the OS keychain (main process), never in the renderer. */
  auth: {
    setToken(token: string): Promise<void>;
    getToken(): Promise<string | null>;
    clear(): Promise<void>;
  };
  /** Fingerprint reader - native SDK runs in main; renderer only gets a template. */
  fingerprint: {
    capture(): Promise<CaptureResult>;
  };
  app: {
    getConfig(): Promise<AppConfig>;
  };
}

/** IPC channel names - the single source of truth for both ends. */
export const IPC = {
  apiRequest: 'api:request',
  authSetToken: 'auth:setToken',
  authGetToken: 'auth:getToken',
  authClear: 'auth:clear',
  fingerprintCapture: 'fingerprint:capture',
  appGetConfig: 'app:getConfig',
} as const;
