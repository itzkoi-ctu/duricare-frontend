import { useLanguage } from '../../i18n/useLanguage';
import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
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
  if (isLoading) return <SessionLoading />;
  if (!user) return <RequireAuth />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace state={{ authNotice: 'forbidden' }} />;
  return children ?? <Outlet />;
}
