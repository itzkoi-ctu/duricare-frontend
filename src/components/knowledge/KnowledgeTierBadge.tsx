import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { Tier } from '../../types/governance';
import { TIER_CONFIG } from '../../utils/governanceStatus';

interface KnowledgeTierBadgeProps {
  tier: Tier;
  showDesc?: boolean;
}

export default function KnowledgeTierBadge({ tier, showDesc = false }: KnowledgeTierBadgeProps) {
  useLanguage();
  const config = TIER_CONFIG[tier] || TIER_CONFIG.UNKNOWN;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center h-6 min-h-[24px] px-2.5 rounded-[6px] border text-xs font-medium leading-none ${config.badgeClass}`}
      >
        {t(config.label)}
      </span>
      {showDesc && (
        <span className="text-xs text-gray truncate" title={t(config.desc)}>
          {t(config.desc)}
        </span>
      )}
    </div>
  );
}
