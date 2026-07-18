import type { ComponentType } from 'react';
import { IconHome, IconStudents, IconOnboard, IconStaff, IconReceipt } from './icons';

export type View = 'overview' | 'students' | 'onboard' | 'staff' | 'transactions';

export interface NavItem {
  view: View;
  label: string;
  title: string;
  group: 'School' | 'Finance';
  icon: ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { view: 'overview', label: 'Overview', title: 'Overview', group: 'School', icon: IconHome },
  { view: 'students', label: 'Students', title: 'Students', group: 'School', icon: IconStudents },
  { view: 'onboard', label: 'Onboard student', title: 'Onboard a student', group: 'School', icon: IconOnboard },
  { view: 'staff', label: 'Staff', title: 'Staff & permissions', group: 'School', icon: IconStaff },
  { view: 'transactions', label: 'Transactions', title: 'Transactions', group: 'Finance', icon: IconReceipt },
];
