import { useLanguage } from '../../../i18n/useLanguage';
import { t } from '../../../i18n';
import type { PublicationStatus } from '../../../types/publication';

interface StatusStyle {
  labelKey: string;
  badgeClass: string;
  dotClass: string;
}

export const PUBLICATION_STATUS_CONFIG: Record<PublicationStatus, StatusStyle> = {
  ACTIVE: {
    labelKey: 'Đang phục vụ RAG',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-600',
  },
  PENDING: {
    labelKey: 'Chờ hoàn tất',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  SUPERSEDED: {
    labelKey: 'Đã thay thế',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    dotClass: 'bg-slate-500',
  },
  REVOKED: {
    labelKey: 'Đã thu hồi',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

interface PublicationStatusBadgeProps {
  status: PublicationStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function PublicationStatusBadge({
  status,
}: PublicationStatusBadgeProps) {
  useLanguage();

  const config = PUBLICATION_STATUS_CONFIG[status];
  const testId = `publication-status-badge-${status.toLowerCase()}`;

  if (!config) {
    return (
      <span
        data-testid={testId}
        data-preview-badge="true"
        className="inline-flex items-center gap-1.5 h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap shadow-2xs leading-none"
      >
        <span>{String(status)}</span>
      </span>
    );
  }

  return (
    <span
      data-testid={testId}
      data-preview-badge="true"
      className={`inline-flex items-center gap-1.5 h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold whitespace-nowrap shadow-2xs leading-none ${config.badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{t(config.labelKey)}</span>
    </span>
  );
}
