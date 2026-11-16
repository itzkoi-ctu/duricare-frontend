import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { DecisionOutcome } from '../../types/governance';
import { DECISION_OUTCOME_CONFIG } from '../../utils/governanceStatus';

export interface DecisionOutcomeBadgeProps {
  outcome: DecisionOutcome;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  shape?: 'pill' | 'rounded';
  className?: string;
}

export default function DecisionOutcomeBadge({
  outcome,
  size = 'md',
  showIcon = true,
  shape = 'pill',
  className = '',
}: DecisionOutcomeBadgeProps) {
  useLanguage();
  const config = DECISION_OUTCOME_CONFIG[outcome] || DECISION_OUTCOME_CONFIG.CHANGES_REQUESTED;

  const roundedClass = shape === 'rounded' ? 'rounded-lg' : 'rounded-full';

  const sizeClasses =
    shape === 'rounded'
      ? 'h-6 px-2.5 text-xs gap-1 leading-none font-semibold'
      : size === 'sm'
        ? 'px-2 py-0.5 text-[11px] gap-1'
        : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      data-testid="decision-outcome-badge"
      className={`inline-flex items-center border shrink-0 ${config.badgeClass} ${roundedClass} ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <span
          aria-hidden="true"
          className="material-symbols-outlined badge-icon shrink-0"
        >
          {config.icon}
        </span>
      )}
      <span className="leading-none">{t(config.label)}</span>
    </span>
  );
}
