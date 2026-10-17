import { useLanguage } from '../../i18n/useLanguage';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { roleLanding } from '../../utils/authNavigation';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth';
import RequireAuth from './RequireAuth';
import SessionLoading from './SessionLoading';

export default function RequireRole({ roles, children }: {
  roles: readonly User['role'][];
  children?: ReactNode;
}) {
  useLanguage();
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <SessionLoading />;
  if (!user) return <RequireAuth />;
  if (!roles.includes(user.role)) {
    const landing = roleLanding(user.role);
    if (location.pathname === landing) return <p role="alert">Bạn không có quyền truy cập trang này</p>;
    return <Navigate to={landing} replace state={{ authNotice: 'forbidden' }} />;
  }
  return children ?? <Outlet />;
}
