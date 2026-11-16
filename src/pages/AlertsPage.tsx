import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAlerts from '../hooks/useAlerts';
import { useOverviewContext } from '../context/OverviewContext';
import AlertCard from '../components/AlertCard';
import AlertsSkeleton from '../components/AlertsSkeleton';
import ErrorState from '../components/ErrorState';
import type { AlertSource } from '../types/alert';

export default function AlertsPage() {
  useLanguage();
  const { alerts, loading, refreshing, error, resolveError, dismissResolveError, pendingIds, refresh, resolve } =
    useAlerts();
  const overview = useOverviewContext();
  const [params, setParams] = useSearchParams();

  // Support both canonical ?zone= and alias ?zoneCode= with precedence zone > zoneCode
  const rawZone = params.get('zone');
  const rawZoneCode = params.get('zoneCode');
  const zoneFilter = rawZone ?? rawZoneCode ?? '';

  const [sourceFilter, setSourceFilter] = useState<'ALL' | AlertSource>('ALL');
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  const zoneNames = useMemo(
    () => new Map(overview.data?.zones.map(zone => [zone.code, zone.name]) ?? []),
    [overview.data]
  );
  const zoneCodes = useMemo(
    () => [...new Set(alerts.map(alert => alert.zoneCode))].sort(),
    [alerts]
  );

  const filtered = useMemo(
    () =>
      alerts.filter(
        alert =>
          (!zoneFilter || alert.zoneCode === zoneFilter) &&
          (sourceFilter === 'ALL' || alert.source === sourceFilter)
      ),
    [alerts, zoneFilter, sourceFilter]
  );

  const hardCount = useMemo(() => filtered.filter(a => a.source === 'HARD').length, [filtered]);
  const agenticCount = useMemo(() => filtered.filter(a => a.source === 'AGENTIC').length, [filtered]);

  const changeZone = (zone: string) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (zone) {
        next.set('zone', zone);
        next.delete('zoneCode'); // Normalize to canonical query param
      } else {
        next.delete('zone');
        next.delete('zoneCode');
      }
      return next;
    });
  };

  const resetFilters = () => {
    changeZone('');
    setSourceFilter('ALL');
  };

  const handleResolve = async (id: number) => {
    setResolvedId(null);
    if (await resolve(id)) {
      setResolvedId(id);
      void overview.refresh();
    }
  };

  if (loading) return <AlertsSkeleton />;
  if (error && alerts.length === 0) {
    return <ErrorState message={error} onRetry={() => { void refresh(); }} />;
  }

  return (
    <div className="bg-[#f8f9ff] dark:bg-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* 1. Heading Bar */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text tracking-tight">{t('Cảnh báo')}</h1>
              <span
                data-total-alerts
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 whitespace-nowrap"
              >
                {alerts.length} {t('chưa xử lý')}
              </span>
            </div>
            <button
              type="button"
              aria-label={t('Làm mới')}
              onClick={() => { void refresh(); }}
              disabled={refreshing}
              className="w-10 h-10 sm:w-auto sm:px-3.5 sm:h-10 rounded-lg border border-border bg-surface hover:bg-bg text-text text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              >
                refresh
              </span>
              <span className="hidden sm:inline">{refreshing ? t('Đang cập nhật…') : t('Làm mới')}</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray mt-1">
            {t('Theo dõi và xử lý cảnh báo tại các khu vực.')}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && alerts.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-coral/30 bg-coral/10 text-coral p-3 text-sm flex items-center justify-between gap-3"
          >
            <span>{t('Không thể cập nhật cảnh báo.')}</span>
            <button
              type="button"
              onClick={() => { void refresh(); }}
              className="underline font-semibold cursor-pointer"
            >
              {t('Thử lại')}
            </button>
          </div>
        )}

        {resolveError && (
          <div
            role="alert"
            data-resolve-error
            className="fixed z-50 inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] sm:left-auto sm:right-6 sm:w-96 rounded-xl border border-coral/40 bg-surface text-text p-4 shadow-lg flex items-start gap-3"
          >
            <span className="material-symbols-outlined text-coral text-lg shrink-0 mt-0.5" aria-hidden="true">
              error
            </span>
            <span className="text-sm flex-1">{resolveError}</span>
            <button
              type="button"
              aria-label={t('Đóng thông báo lỗi')}
              onClick={dismissResolveError}
              className="text-coral hover:text-coral/80 cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        <div aria-live="polite" className="text-xs text-teal">
          {pendingIds.length > 0
            ? t('Đang lưu trạng thái xử lý…')
            : resolvedId !== null
            ? t('Đã xử lý cảnh báo #{0}.', [resolvedId])
            : null}
        </div>

        {/* 2. White Toolbar Filter Card */}
        <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 shadow-2xs">
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-6">
            {/* Filter 1: Khu vực */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label
                htmlFor="zone-filter"
                className="text-xs sm:text-sm font-medium text-gray whitespace-nowrap"
              >
                {t('Khu vực:')}
              </label>
              <div className="relative w-full">
                <select
                  id="zone-filter"
                  name="filter-zone"
                  data-testid="filter-zone"
                  value={zoneFilter}
                  onChange={event => changeZone(event.target.value)}
                  className="h-9 w-full sm:min-w-[180px] pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 bg-surface border border-border rounded-lg text-text text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#1f5ca9] focus:border-[#1f5ca9] appearance-none cursor-pointer"
                >
                  <option value="">{t('Tất cả khu vực')}</option>
                  {zoneFilter && !zoneCodes.includes(zoneFilter) && (
                    <option value={zoneFilter}>
                      {zoneNames.get(zoneFilter) ?? zoneFilter} ({zoneFilter})
                    </option>
                  )}
                  {zoneCodes.map(code => (
                    <option key={code} value={code}>
                      {zoneNames.get(code) ? `${zoneNames.get(code)} (${code})` : code}
                    </option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined absolute right-1.5 sm:right-2.5 top-2 text-gray pointer-events-none text-[18px]"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Filter 2: Nguồn cảnh báo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label
                htmlFor="source-filter"
                className="text-xs sm:text-sm font-medium text-gray whitespace-nowrap"
              >
                {t('Nguồn cảnh báo:')}
              </label>
              <div className="relative w-full">
                <select
                  id="source-filter"
                  name="filter-source"
                  data-testid="filter-source"
                  value={sourceFilter}
                  onChange={event => setSourceFilter(event.target.value as 'ALL' | AlertSource)}
                  className="h-9 w-full sm:min-w-[200px] pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 bg-surface border border-border rounded-lg text-text text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#1f5ca9] focus:border-[#1f5ca9] appearance-none cursor-pointer"
                >
                  <option value="ALL">{t('Tất cả')}</option>
                  <option value="HARD">{t('Cảnh báo cứng (HARD)')}</option>
                  <option value="AGENTIC">{t('Cảnh báo AI (AGENTIC)')}</option>
                </select>
                <span
                  className="material-symbols-outlined absolute right-1.5 sm:right-2.5 top-2 text-gray pointer-events-none text-[18px]"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Empty vs List Content */}
        {filtered.length === 0 ? (
          <div data-empty-state className="rounded-2xl border border-border bg-surface p-8 text-center shadow-2xs">
            <span
              className={`material-symbols-outlined text-[36px] ${
                alerts.length === 0 ? 'text-teal' : 'text-gray'
              }`}
              aria-hidden="true"
            >
              {alerts.length === 0 ? 'check_circle' : 'filter_alt_off'}
            </span>
            <h2 className="mt-3 font-semibold text-text text-base">
              {alerts.length === 0 ? t('Chưa có cảnh báo nào') : t('Không có cảnh báo khớp bộ lọc')}
            </h2>
            <p className="mt-2 text-sm text-gray max-w-md mx-auto">
              {alerts.length === 0
                ? t('Không có cảnh báo chưa xử lý. Hệ thống sẽ tiếp tục theo dõi các vùng canh tác.')
                : t('Thử chọn vùng khác hoặc thay đổi nguồn cảnh báo.')}
            </p>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 text-sm font-semibold text-[#1f5ca9] dark:text-[#38bdf8] underline cursor-pointer"
              >
                {t('Xóa bộ lọc')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Meta Row: Count & Source breakdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs sm:text-sm text-gray font-medium">
                {t('Hiển thị {0}/{1} cảnh báo · Mới nhất trước', [filtered.length, alerts.length])}
              </span>
              <div className="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 bg-surface rounded-md text-gray border border-border shadow-2xs">
                <span>{t('{0} cảnh báo cứng', [hardCount])}</span>
                <span className="text-border dark:text-gray/40">•</span>
                <span>{t('{0} cảnh báo AI', [agenticCount])}</span>
              </div>
            </div>

            {/* Vertical Stack: Full-width Alert Cards */}
            <div className="space-y-3.5 sm:space-y-4">
              {filtered.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  zoneName={zoneNames.get(alert.zoneCode) ?? alert.zoneCode}
                  onResolve={id => { void handleResolve(id); }}
                  isPending={pendingIds.includes(alert.id)}
                />
              ))}
            </div>

            {/* Footer Notice */}
            <div className="text-xs text-gray italic flex items-center justify-center gap-1.5 py-4 border-t border-border mt-6">
              <span className="material-symbols-outlined text-[15px] text-gray/80" aria-hidden="true">
                info
              </span>
              <span>{t('Đánh dấu đã xử lý chỉ cập nhật trạng thái cảnh báo trong hệ thống.')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
