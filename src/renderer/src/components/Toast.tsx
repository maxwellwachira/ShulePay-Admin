import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { IconCheck, IconAlert, IconInfo } from './icons';

type Kind = 'ok' | 'err' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ICONS: Record<Kind, typeof IconCheck> = { ok: IconCheck, err: IconAlert, info: IconInfo };

const ToastCtx = createContext<{ push: (kind: Kind, text: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div key={t.id} className={`toast toast-${t.kind}`}>
              <Icon className="ic" />
              <span>{t.text}</span>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): { push: (kind: Kind, text: string) => void } {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
