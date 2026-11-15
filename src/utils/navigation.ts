import type { NavigationItem } from '../types/navigation';
import type { User } from '../types/auth';

export const NAVIGATION: readonly NavigationItem[] = [
  // THEO DÕI
  { path: '/', label: 'Tổng quan', icon: 'grid_view', tone: 'navy', group: 'THEO_DOI' },
  { path: '/alerts', label: 'Cảnh báo', icon: 'warning', mobileIcon: 'notifications', tone: 'coral', group: 'THEO_DOI' },
  { path: '/agent', label: 'Trợ lý AI', icon: 'psychology', tone: 'navy', group: 'THEO_DOI' },

  // QUẢN TRỊ (Thứ tự chuẩn theo thiết kế Stitch đã duyệt)
  { path: '/settings/zones', label: 'Quản lý khu vực', mobileLabel: 'Khu vực', icon: 'yard', tone: 'navy', roles: ['ADMIN'], group: 'QUAN_TRI' },
  { path: '/knowledge/sources', label: 'Nguồn tri thức', mobileLabel: 'Tri thức', icon: 'menu_book', tone: 'navy', roles: ['ADMIN'], group: 'QUAN_TRI' },
  { path: '/settings/knowledge', label: 'Điều phối thẩm định', mobileLabel: 'Điều phối', icon: 'rule', tone: 'navy', roles: ['ADMIN'], group: 'QUAN_TRI' },
  { path: '/settings/experts', label: 'Chuyên gia', mobileLabel: 'Chuyên gia', icon: 'badge', tone: 'navy', roles: ['ADMIN'], group: 'QUAN_TRI' },
  { path: '/settings/farm', label: 'Cài đặt vườn', icon: 'settings', tone: 'navy', roles: ['ADMIN'], group: 'QUAN_TRI' },
];

export function navigationForRole(role: User['role']): readonly NavigationItem[] {
  if (role === 'EXPERT') {
    return [
      { path: '/knowledge', label: 'Tài khoản chuyên gia', mobileLabel: 'Tài khoản', icon: 'school', tone: 'teal', group: 'THEO_DOI' },
      { path: '/knowledge/sources', label: 'Nguồn tri thức', mobileLabel: 'Tri thức', icon: 'menu_book', tone: 'teal', group: 'QUAN_TRI' },
      { path: '/knowledge/reviews', label: 'Nhiệm vụ thẩm định', mobileLabel: 'Thẩm định', icon: 'rate_review', tone: 'teal', group: 'QUAN_TRI' },
    ];
  }
  return NAVIGATION.filter(item => !item.roles || item.roles.includes(role));
}
