import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { RevisionStatus } from '../../types/governance';
import { REVISION_STATUS_CONFIG } from '../../utils/governanceStatus';

interface KnowledgeStatusBadgeProps {
  status: RevisionStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function KnowledgeStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: KnowledgeStatusBadgeProps) {
  useLanguage();
  const config = REVISION_STATUS_CONFIG[status] || REVISION_STATUS_CONFIG.DRAFT;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${config.badgeClass} ${sizeClasses}`}
      title={t(config.description)}
    >
      <span className={`rounded-full shrink-0 ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${config.dotClass}`} />
      {showIcon && (
        <span aria-hidden="true" className={`material-symbols-outlined shrink-0 ${size === 'sm' ? 'text-[13px]' : 'text-sm'}`}>
          {config.icon}
        </span>
      )}
      <span>{t(config.label)}</span>
    </span>
  );
}
