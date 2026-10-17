import { createContext } from 'react';

export interface ToastContextValue {
  showToast: (message: string, tone?: 'teal' | 'coral' | 'navy') => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
