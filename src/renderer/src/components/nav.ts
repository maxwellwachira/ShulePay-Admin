import type { ComponentType } from 'react';
import {
  IconHome,
  IconStudents,
  IconOnboard,
  IconStaff,
  IconReceipt,
  IconChart,
  IconTerminals,
  IconSettings,
} from './icons';

export type View =
  | 'overview'
  | 'students'
  | 'onboard'
  | 'staff'
  | 'transactions'
  | 'reports'
  | 'terminals'
  | 'settings';

export interface NavItem {
  view: View;
  label: string;
  title: string;
  subtitle: string;
  group: 'School' | 'Finance' | 'Admin';
  icon: ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { view: 'overview', label: 'Overview', title: 'Overview', subtitle: "Today's pulse across your school", group: 'School', icon: IconHome },
  { view: 'students', label: 'Students', title: 'Students', subtitle: 'Every onboarded student and their wallet', group: 'School', icon: IconStudents },
  { view: 'onboard', label: 'Onboard student', title: 'Onboard a student', subtitle: 'Details, guardian, then fingerprint in three quick steps', group: 'School', icon: IconOnboard },
  { view: 'staff', label: 'Staff', title: 'Staff & permissions', subtitle: 'Who can use this console, and at what level', group: 'School', icon: IconStaff },
  { view: 'transactions', label: 'Transactions', title: 'Transactions', subtitle: 'Top-ups, purchases, and withdrawals across the school', group: 'Finance', icon: IconReceipt },
  { view: 'reports', label: 'Reports', title: 'Reports & insights', subtitle: 'How money moves through your school', group: 'Finance', icon: IconChart },
  { view: 'terminals', label: 'Terminals', title: 'POS terminals', subtitle: 'The devices students tap their fingers on', group: 'Finance', icon: IconTerminals },
  { view: 'settings', label: 'Settings', title: 'Settings', subtitle: 'School profile, your account, and app info', group: 'Admin', icon: IconSettings },
];

export const NAV_GROUPS = ['School', 'Finance', 'Admin'] as const;
