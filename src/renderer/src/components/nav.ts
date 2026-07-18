import type { ComponentType } from 'react';
import { IconHome, IconStudents, IconOnboard, IconStaff, IconReceipt, IconTerminals, IconSettings } from './icons';

export type View = 'overview' | 'students' | 'onboard' | 'staff' | 'transactions' | 'terminals' | 'settings';

export interface NavItem {
  view: View;
  label: string;
  title: string;
  group: 'School' | 'Finance' | 'Admin';
  icon: ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { view: 'overview', label: 'Overview', title: 'Overview', group: 'School', icon: IconHome },
  { view: 'students', label: 'Students', title: 'Students', group: 'School', icon: IconStudents },
  { view: 'onboard', label: 'Onboard student', title: 'Onboard a student', group: 'School', icon: IconOnboard },
  { view: 'staff', label: 'Staff', title: 'Staff & permissions', group: 'School', icon: IconStaff },
  { view: 'transactions', label: 'Transactions', title: 'Transactions', group: 'Finance', icon: IconReceipt },
  { view: 'terminals', label: 'Terminals', title: 'POS terminals', group: 'Finance', icon: IconTerminals },
  { view: 'settings', label: 'Settings', title: 'Settings', group: 'Admin', icon: IconSettings },
];

export const NAV_GROUPS = ['School', 'Finance', 'Admin'] as const;
