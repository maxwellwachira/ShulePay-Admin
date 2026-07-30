/**
 * The typed contract for the ONLY surface the renderer can touch in the main process.
 * Shared by main (implements), preload (exposes via contextBridge), and renderer
 * (consumes as `window.thumbpay`). Keep it minimal - every method here is privileged.
 */

export interface CaptureResult {
  template: string; // base64 fingerprint template (never a raw image)
  quality: number; // 0..100
  simulated: boolean; // true when produced by the stub, not a physical reader
}

/** What the desk operator needs to know about the attached reader before scanning. */
export interface ReaderStatus {
  connected: boolean; // a physical device is present and initialised
  simulated: boolean; // no vendor SDK/device — captures are fabricated for development
  deviceName: string | null; // vendor/model string when known
  message: string | null; // human-readable reason when not connected (e.g. driver missing)
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

export interface ThumbPayBridge {
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
    /**
     * Acquire one fingerprint template. Used both to enroll a student and, at a till,
     * to capture the finger that a payment must be authorized against (the backend does
     * the 1:N match — see the API client's `identifyMember`).
     */
    capture(): Promise<CaptureResult>;
    /** Whether a real reader is attached, so the UI can flag simulated captures. */
    status(): Promise<ReaderStatus>;
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
  fingerprintStatus: 'fingerprint:status',
  appGetConfig: 'app:getConfig',
} as const;
