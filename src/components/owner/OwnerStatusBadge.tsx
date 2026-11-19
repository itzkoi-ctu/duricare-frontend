import { t } from '../../i18n';

interface OwnerStatusBadgeProps {
  enabled: boolean;
  className?: string;
}

export default function OwnerStatusBadge({ enabled, className = '' }: OwnerStatusBadgeProps) {
  if (enabled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 h-[26px] min-h-[26px] px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 select-none ${className}`}
      >
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        <span>{t("Đang hoạt động")}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[26px] min-h-[26px] px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 select-none ${className}`}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#64748b]" />
      <span>{t("Đã khóa")}</span>
    </span>
  );
}
