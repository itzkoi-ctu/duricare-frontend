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
        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${config.badgeClass}`}
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
