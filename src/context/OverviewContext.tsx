import { useLanguage } from '../i18n/useLanguage';
import { createContext, useContext, type ReactNode } from 'react';
import useOverview, { type UseOverviewReturn } from '../hooks/useOverview';

const OverviewContext = createContext<UseOverviewReturn | null>(null);

export function OverviewProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const overviewState = useOverview();
  return (
    <OverviewContext.Provider value={overviewState}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverviewContext(): UseOverviewReturn {
  const context = useContext(OverviewContext);
  if (!context) {
    throw new Error('useOverviewContext must be used within an OverviewProvider');
  }
  return context;
}
