import { useState, type ReactNode, type ComponentType } from 'react';
import { IconAlert, IconCopy, IconCheck } from './icons';

/** Shared page-state primitives: loading skeletons, empty states, error states. */

export function SkeletonRows({ rows = 4 }: { rows?: number }): JSX.Element {
  return (
    <div className="sk-rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 16, width: `${100 - (i % 3) * 14}%` }} />
      ))}
    </div>
  );
}

export function SkeletonStat(): JSX.Element {
  return (
    <div className="stat" aria-hidden="true">
      <div className="skeleton" style={{ height: 13, width: '55%' }} />
      <div className="skeleton" style={{ height: 26, width: '40%', marginTop: 12 }} />
      <div className="skeleton" style={{ height: 11, width: '65%', marginTop: 8 }} />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="state">
      <div className="state-icon">
        <Icon className="ic" />
      </div>
      <div className="state-title">{title}</div>
      {hint && <div className="state-hint">{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }): JSX.Element {
  return (
    <div className="state" role="alert">
      <div className="state-icon err">
        <IconAlert className="ic" />
      </div>
      <div className="state-title">Something went wrong</div>
      <div className="state-hint">{message ?? 'The request failed. Check your connection and try again.'}</div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Copy-to-clipboard button with a transient "copied" confirmation. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? <IconCheck className="ic" /> : <IconCopy className="ic" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
