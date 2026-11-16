import { t } from '../i18n';
import type { AlertSource } from '../types/alert';

export function alertSourceClasses(source: AlertSource | string): string {
  if (source === 'HARD') {
    return 'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50';
  }
  if (source === 'AGENTIC') {
    return 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-bg dark:text-gray dark:border-border';
}

export function alertSourceIcon(source: AlertSource | string): string {
  if (source === 'HARD') return 'straighten';
  if (source === 'AGENTIC') return 'psychology';
  return 'warning';
}

export function alertSourceLabel(source: AlertSource | string): string {
  if (source === 'HARD') return t('Cảnh báo cứng');
  if (source === 'AGENTIC') return t('Cảnh báo AI');
  return t(source);
}

export function alertSeverityClasses(severity: string): string {
  const norm = severity.toUpperCase();
  if (norm === 'CRITICAL') {
    return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50';
  }
  if (norm === 'WARNING') {
    return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
  }
  if (norm === 'INFO') {
    return 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/50';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-bg dark:text-gray dark:border-border';
}

export function alertCardBorderClass(severity: string): string {
  const norm = severity.toUpperCase();
  if (norm === 'CRITICAL') return 'border-l-4 border-l-red-500';
  if (norm === 'WARNING') return 'border-l-4 border-l-amber-500';
  if (norm === 'INFO') return 'border-l-4 border-l-blue-400 dark:border-l-sky-500';
  return 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
}
