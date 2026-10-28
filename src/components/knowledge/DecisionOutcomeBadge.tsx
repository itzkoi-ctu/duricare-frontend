import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { DecisionOutcome } from '../../types/governance';
import { DECISION_OUTCOME_CONFIG } from '../../utils/governanceStatus';

interface DecisionOutcomeBadgeProps {
  outcome: DecisionOutcome;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function DecisionOutcomeBadge({
  outcome,
  size = 'md',
  showIcon = true,
}: DecisionOutcomeBadgeProps) {
  useLanguage();
  const config = DECISION_OUTCOME_CONFIG[outcome] || DECISION_OUTCOME_CONFIG.CHANGES_REQUESTED;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full border ${config.badgeClass} ${sizeClasses}`}>
      {showIcon && (
        <span aria-hidden="true" className={`material-symbols-outlined shrink-0 ${size === 'sm' ? 'text-[13px]' : 'text-sm'}`}>
          {config.icon}
        </span>
      )}
      <span>{t(config.label)}</span>
    </span>
  );
}
