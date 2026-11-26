import { t } from '../../i18n';

interface ZoneSourceHeaderProps {
  farmName: string | null;
  farmId: number | null;
  zoneName: string;
  zoneCode: string;
  isOwner: boolean;
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onClose: () => void;
  disableActions?: boolean;
}

export default function ZoneSourceHeader({
  farmName,
  farmId,
  zoneName,
  zoneCode,
  isOwner,
  title,
  subtitle,
  canGoBack = false,
  onBack,
  onRefresh,
  refreshing = false,
  onClose,
  disableActions = false,
}: ZoneSourceHeaderProps) {
  const farmLabel = farmId
    ? `${farmName || t('Nông trại')} · #${farmId}`
    : farmName || t('Nông trại');

  return (
    <header className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex items-start justify-between gap-3 shrink-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {canGoBack && onBack && (
            <button
              type="button"
              data-testid="btn-drawer-back"
              onClick={onBack}
              disabled={disableActions}
              aria-label={t('Quay lại')}
              className="w-8 h-8 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          )}
          <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-[6px] bg-[#F1F5F9] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-[12px] font-semibold text-[#475569] dark:text-[#CBD5E1] whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px] text-[#64748B] dark:text-[#94A3B8]">
              yard
            </span>
            <span>{farmLabel}</span>
          </span>
          <span className="text-[#CBD5E1] dark:text-[#475569]">/</span>
          <span className="inline-flex items-center h-[26px] px-2.5 rounded-[6px] bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-[12px] font-semibold text-[#1F5CA9] dark:text-[#60A5FA] whitespace-nowrap">
            {zoneName ? `${zoneName} · ${zoneCode}` : zoneCode}
          </span>
          {isOwner && (
            <span
              data-testid="badge-owner-readonly"
              className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-[6px] bg-slate-100 dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
            >
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              <span>{t('Chỉ xem')}</span>
            </span>
          )}
        </div>

        <h2
          id="zone-source-drawer-title"
          className="text-lg sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-7 sm:leading-8 truncate"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <button
            type="button"
            data-testid="btn-refresh-source-status"
            onClick={onRefresh}
            disabled={disableActions || refreshing}
            title={t('Làm mới trạng thái')}
            aria-label={t('Làm mới trạng thái')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                refreshing ? 'animate-spin' : ''
              }`}
            >
              refresh
            </span>
          </button>
        )}
        <button
          type="button"
          data-testid="btn-close-source-drawer"
          onClick={onClose}
          title={t('Đóng')}
          aria-label={t('Đóng')}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-[#475569] dark:text-[#CBD5E1] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 dark:hover:border-red-800 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </header>
  );
}
