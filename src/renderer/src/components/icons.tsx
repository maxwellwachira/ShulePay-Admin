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

export const IconFingerprint = ({ className }: P): JSX.Element => (
  <svg {...base} className={className}>
    <path d="M12 11a2 2 0 0 1 2 2c0 2-.2 4-1 6" />
    <path d="M8 13a4 4 0 0 1 8 0c0 3-.5 5-1.5 7" />
    <path d="M5 13a7 7 0 0 1 14 0c0 1.5-.2 3-.5 4.5" />
    <path d="M12 3a10 10 0 0 0-7 3" />
  </svg>
);
