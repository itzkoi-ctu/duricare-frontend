import type { User } from './auth';

export type NavigationGroup = 'THEO_DOI' | 'QUAN_TRI';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  mobileIcon?: string;
  mobileLabel?: string;
  tone: 'navy' | 'coral' | 'teal';
  roles?: readonly User['role'][];
  group?: NavigationGroup;
}
