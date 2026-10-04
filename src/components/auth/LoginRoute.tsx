import { useLanguage } from '../../i18n/useLanguage';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loginDestination } from '../../utils/authNavigation';
import SessionLoading from './SessionLoading';

export default function LoginRoute({ children }: { children: ReactNode }) {
  useLanguage();
  const { isLoading, isAuthenticated } = useAuth();
  const { state } = useLocation();
  if (isLoading) return <SessionLoading />;
  // A login just completed with a saved destination; manual /login visits have no state.
  if (isAuthenticated) return <Navigate to={loginDestination(state)} replace />;
  return children;
}
