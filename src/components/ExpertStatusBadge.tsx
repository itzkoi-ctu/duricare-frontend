import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import type { VerificationStatus } from '../types/expert';
import { EXPERT_STATUS_CONFIG } from '../utils/expertStatus';

export default function ExpertStatusBadge({ status, size = 'sm' }: {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}) {
  useLanguage();
  const config = EXPERT_STATUS_CONFIG[status];
  const isMd = size === 'md';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${config.badgeTone} ${
        isMd ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined ${isMd ? 'text-[16px]' : 'text-[14px]'}`}
      >
        {config.icon}
      </span>
      <span>{t(config.label)}</span>
    </span>
  );
}
