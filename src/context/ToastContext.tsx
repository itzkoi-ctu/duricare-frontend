import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { ToastContext, type ToastContextValue } from './toastContextStore';

export type { ToastContextValue };

interface ToastItem {
  id: string;
  message: string;
  tone: 'teal' | 'coral' | 'navy';
}

export function ToastProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<number | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, tone: 'teal' | 'coral' | 'navy' = 'navy') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Math.random().toString(36).substring(2);
    setToast({ id, message, tone });
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 5000);
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'teal'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'coral'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      {toast && (
        <div
          role={toast.tone === 'coral' ? 'alert' : 'status'}
          aria-live={toast.tone === 'coral' ? 'assertive' : 'polite'}
          className={`fixed z-50 top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md rounded-xl border p-4 shadow-lg flex items-center justify-between gap-3 bg-surface ${
            toast.tone === 'teal'
              ? 'border-teal/40 text-text'
              : toast.tone === 'coral'
              ? 'border-coral/40 text-text'
              : 'border-navy/40 text-text'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className={`material-symbols-outlined shrink-0 text-xl ${
                toast.tone === 'teal'
                  ? 'text-teal'
                  : toast.tone === 'coral'
                  ? 'text-coral'
                  : 'text-navy dark:text-blue'
              }`}
            >
              {toast.tone === 'teal' ? 'check_circle' : toast.tone === 'coral' ? 'error' : 'info'}
            </span>
            <p className="text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">{t(toast.message)}</p>
          </div>
          <button
            type="button"
            aria-label={t('Đóng thông báo')}
            onClick={hideToast}
            className="min-h-9 min-w-9 shrink-0 flex items-center justify-center rounded-lg text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
