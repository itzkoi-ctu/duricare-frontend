import type { User } from './auth';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  mobileIcon?: string;
  mobileLabel?: string;
  tone: 'navy' | 'coral' | 'teal';
  roles?: readonly User['role'][];
}
