import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { useState } from 'react';
import { formatTimeHHmm } from '../utils/metricLabels';

interface DashboardHeaderProps {
  farmName: string | null;
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export default function DashboardHeader({
  farmName,
  lastUpdated,
  refreshing,
  onRefresh,
}: DashboardHeaderProps) {
  useLanguage();
  const [animating, setAnimating] = useState(false);

  const handleRefreshClick = async () => {
    setAnimating(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setAnimating(false), 600);
    }
  };

  const timeString = lastUpdated
    ? `${formatTimeHHmm(lastUpdated)}:${lastUpdated.getSeconds().toString().padStart(2, '0')}`
    : '--:--:--';

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
      {/* Left: Titles & Subtitle */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-navy/10 text-navy dark:text-blue text-[11px] font-bold uppercase tracking-wider">
            {farmName || t("Nông trại DuriCare")}
          </span>
          <span className="text-gray text-xs">•</span>
          <span className="text-xs text-gray font-medium"> {t("Đại học Cần Thơ (CTU)")} </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight"> {t("Tổng quan nông trại")} </h1>

        <p className="text-xs md:text-sm text-gray mt-1 max-w-2xl leading-relaxed"> {t("Theo dõi thời gian thực các vùng canh tác sầu riêng Monthong & Ri6 - Hệ thống giám sát vi khí hậu & cảm biến rễ")} </p>
      </div>

      {/* Right Controls: Status pill, Last updated, Refresh button */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal/10 text-teal text-xs font-semibold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span>{t("Trạm đo trực tuyến CTU")}</span>
        </div>

        {/* Update timestamp and manual refresh */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border shadow-2xs text-xs text-text">
          <span className="text-gray">{t("Cập nhật lần cuối:")}</span>
          <span className="font-semibold">{timeString}</span>

          <button
            onClick={handleRefreshClick}
            disabled={refreshing || animating}
            className={`p-1 -mr-1 rounded-lg text-gray hover:text-navy hover:bg-bg transition-all cursor-pointer ${
              refreshing || animating ? 'animate-spin text-navy' : ''
            }`}
            title={t("Làm mới dữ liệu ngay")}
            aria-label={t("Làm mới dữ liệu")}
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </div>
    </div>
  );
}
