import type { NavigationItem } from '../types/navigation';
import type { User } from '../types/auth';

export const NAVIGATION: readonly NavigationItem[] = [
  { path: '/', label: 'Tổng quan', icon: 'grid_view', tone: 'navy' },
  { path: '/alerts', label: 'Cảnh báo', icon: 'warning', mobileIcon: 'notifications', tone: 'coral' },
  { path: '/agent', label: 'Trợ lý AI', icon: 'psychology', tone: 'teal' },
  { path: '/settings/farm', label: 'Cài đặt vườn', icon: 'settings', tone: 'navy', roles: ['ADMIN'] },
  { path: '/settings/zones', label: 'Quản lý khu vực', mobileLabel: 'Khu vực', icon: 'yard', tone: 'teal', roles: ['ADMIN'] },
  // Add future management links with roles: ['ADMIN']; both menus use the same filter.
  // Their actual routes must also nest RequireRole inside RequireAuth.
];

export function navigationForRole(role: User['role']): readonly NavigationItem[] {
  return NAVIGATION.filter(item => !item.roles || item.roles.includes(role));
}
