import type { NavigationItem } from '../types/navigation';
import type { User } from '../types/auth';

export const NAVIGATION: readonly NavigationItem[] = [
  { path: '/', label: 'Tổng quan', icon: 'grid_view', tone: 'navy' },
  { path: '/alerts', label: 'Cảnh báo', icon: 'warning', mobileIcon: 'notifications', tone: 'coral' },
  { path: '/agent', label: 'Trợ lý AI', icon: 'psychology', tone: 'teal' },
  { path: '/settings/farm', label: 'Cài đặt vườn', icon: 'settings', tone: 'navy', roles: ['ADMIN'] },
  { path: '/settings/zones', label: 'Quản lý khu vực', mobileLabel: 'Khu vực', icon: 'yard', tone: 'teal', roles: ['ADMIN'] },
  { path: '/settings/experts', label: 'Quản lý chuyên gia', mobileLabel: 'Chuyên gia', icon: 'badge', tone: 'navy', roles: ['ADMIN'] },
];

export function navigationForRole(role: User['role']): readonly NavigationItem[] {
  if (role === 'EXPERT') return [{ path: '/knowledge', label: 'Tài khoản chuyên gia', mobileLabel: 'Tài khoản', icon: 'school', tone: 'teal' }];
  return NAVIGATION.filter(item => !item.roles || item.roles.includes(role));
}
