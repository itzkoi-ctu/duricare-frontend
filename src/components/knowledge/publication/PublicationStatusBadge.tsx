import { useLanguage } from '../../../i18n/useLanguage';
import { t } from '../../../i18n';
import type { PublicationStatus } from '../../../types/publication';
import { PUBLICATION_STATUS_CONFIG } from '../../../utils/publicationStatus';

interface PublicationStatusBadgeProps {
  status: PublicationStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function PublicationStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: PublicationStatusBadgeProps) {
  const currentLanguage = useLanguage();
  const isEn = currentLanguage === 'en';
  const config = PUBLICATION_STATUS_CONFIG[status] || {
    labelVi: status,
    labelEn: status,
    classes: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
    icon: 'help_outline',
  };

  const label = isEn ? config.labelEn : t(config.labelVi);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs md:text-sm';

  return (
    <span
      data-testid={`publication-status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs ${sizeClasses} ${config.classes}`}
    >
      {showIcon && (
        <span aria-hidden="true" className="material-symbols-outlined text-[1.1em] shrink-0">
          {config.icon}
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
