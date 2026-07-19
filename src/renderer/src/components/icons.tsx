/** Minimal line icons (18px, stroke = currentColor). */
type P = { className?: string };
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconOnboard = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

export const IconStudents = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconTerminals = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export const IconReconcile = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 5-6" />
  </svg>
);

export const IconSignOut = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const IconHome = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const IconReceipt = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export const IconStaff = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <circle cx="9" cy="7" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M17 8.5l1.2 1.2L21 7" />
  </svg>
);

export const IconSettings = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </svg>
);

export const IconChart = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M3 3v18h18" />
    <path d="M7 15v3M12 10v8M17 6v12" />
  </svg>
);

export const IconSearch = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export const IconCopy = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconCheck = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconAlert = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconInfo = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-5M12 8h.01" />
  </svg>
);

export const IconRefresh = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

export const IconEye = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a20.7 20.7 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 5c7 0 11 7 11 7a20.8 20.8 0 0 1-3.22 4.31" />
    <path d="M1 1l22 22" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

export const IconShield = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconZap = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

export const IconFingerprint = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M12 11a2 2 0 0 1 2 2c0 2-.2 4-1 6" />
    <path d="M8 13a4 4 0 0 1 8 0c0 3-.5 5-1.5 7" />
    <path d="M5 13a7 7 0 0 1 14 0c0 1.5-.2 3-.5 4.5" />
    <path d="M12 3a10 10 0 0 0-7 3" />
  </svg>
);
