import { useLanguage } from '../../../i18n/useLanguage';
import { t } from '../../../i18n';
import type { JobStatus, JobKind } from '../../../types/publication';
import { JOB_STATUS_CONFIG, JOB_KIND_CONFIG } from '../../../utils/publicationStatus';

interface JobStatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export function JobStatusBadge({ status, size = 'sm' }: JobStatusBadgeProps) {
  const currentLanguage = useLanguage();
  const isEn = currentLanguage === 'en';
  const config = JOB_STATUS_CONFIG[status] || {
    labelVi: status,
    labelEn: status,
    classes: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
    icon: 'help_outline',
  };

  const label = isEn ? config.labelEn : t(config.labelVi);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs md:text-sm';

  return (
    <span
      data-testid={`job-status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs ${sizeClasses} ${config.classes}`}
    >
      <span aria-hidden="true" className={`material-symbols-outlined text-[1.1em] shrink-0 ${status === 'RUNNING' ? 'animate-spin' : ''}`}>
        {config.icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

interface JobKindBadgeProps {
  kind: JobKind;
}

export function JobKindBadge({ kind }: JobKindBadgeProps) {
  const currentLanguage = useLanguage();
  const isEn = currentLanguage === 'en';
  const config = JOB_KIND_CONFIG[kind];

  const label = isEn ? config.labelEn : t(config.labelVi);

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-gray dark:text-gray-300 bg-bg dark:bg-surface px-2 py-0.5 rounded border border-border">
      <span aria-hidden="true" className="material-symbols-outlined text-xs">
        {config.icon}
      </span>
      <span>{label}</span>
    </span>
  );
}
