import { useLanguage } from '../i18n/useLanguage';
import type { ReactNode } from 'react';
import useAuthSession from '../hooks/useAuthSession';
import { AuthContext } from './authContextStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const auth = useAuthSession();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
