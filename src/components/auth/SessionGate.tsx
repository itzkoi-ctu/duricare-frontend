import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import SessionLoading from './SessionLoading';

// Finish session restoration before route guards make authentication decisions.
export default function SessionGate({ children }: { children: ReactNode }) {
  useLanguage();
  const { isLoading, restoreError, retryRestore } = useAuth();
  if (isLoading) return <SessionLoading />;
  if (restoreError) return (
    <main className="min-h-dvh flex items-center justify-center bg-bg text-text px-6">
      <div className="max-w-sm text-center space-y-5">
        <p role="alert">{t(restoreError)}</p>
        <button onClick={retryRestore} className="min-h-11 px-6 rounded-xl bg-navy text-surface dark:text-bg font-semibold cursor-pointer">{t("Thử lại")}</button>
      </div>
    </main>
  );
  return children;
}
