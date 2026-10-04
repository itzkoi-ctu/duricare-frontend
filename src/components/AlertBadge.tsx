import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { AlertSource } from '../types/alert';

interface AlertBadgeProps {
  count: number;
  /** The most severe alert source for this zone: HARD > AGENTIC > none */
  dominantSource: AlertSource | null;
}

export default function AlertBadge({ count, dominantSource }: AlertBadgeProps) {
  useLanguage();
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                        text-xs font-medium bg-teal/10 text-teal"> {t("✓ Không có cảnh báo")} </span>
    );
  }

  // HARD alerts get the more urgent coral/red styling, AGENTIC gets amber/orange
  const isHard = dominantSource === 'HARD';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                  text-xs font-semibold
                  ${isHard
                    ? 'bg-coral/15 text-coral'
                    : 'bg-amber/15 text-amber'
                  }`}
    >
      <span className={`w-2 h-2 rounded-full animate-pulse
                        ${isHard ? 'bg-coral' : 'bg-amber'}`} />
      {count} {t("cảnh báo", [count])} </span>
  );
}
