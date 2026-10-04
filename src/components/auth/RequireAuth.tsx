import { useLanguage } from '../../i18n/useLanguage';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SessionLoading from './SessionLoading';

export default function RequireAuth({ children }: { children?: ReactNode }) {
  useLanguage();
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (isLoading) return <SessionLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{
    from: location.pathname + location.search + location.hash,
  }} />;
  return children ?? <Outlet />;
}
