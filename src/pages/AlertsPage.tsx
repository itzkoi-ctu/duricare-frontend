import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import useAlerts from '../hooks/useAlerts';
import { useOverviewContext } from '../context/OverviewContext';
import AlertCard from '../components/AlertCard';
import AlertsSkeleton from '../components/AlertsSkeleton';
import ErrorState from '../components/ErrorState';
import type { AlertSource } from '../types/alert';

interface AlertFilters {
  zone: string;
  source: 'ALL' | AlertSource;
}

export default function AlertsPage() {
  useLanguage();
  const { alerts, loading, refreshing, error, resolveError, dismissResolveError, pendingIds, refresh, resolve } = useAlerts();
  const overview = useOverviewContext();
  const [params, setParams] = useSearchParams();
  const zoneFilter = params.get('zone') || '';
  const { register, control, resetField } = useForm<AlertFilters>({ defaultValues: { zone: zoneFilter, source: 'ALL' } });
  const sourceFilter = useWatch({ control, name: 'source' });
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  const zoneNames = useMemo(() => new Map(overview.data?.zones.map(zone => [zone.code, zone.name]) ?? []), [overview.data]);
  const zoneCodes = useMemo(() => [...new Set(alerts.map(alert => alert.zoneCode))].sort(), [alerts]);
  const filtered = useMemo(() => alerts.filter(alert => (!zoneFilter || alert.zoneCode === zoneFilter) && (sourceFilter === 'ALL' || alert.source === sourceFilter)), [alerts, zoneFilter, sourceFilter]);

  const changeZone = (zone: string) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (zone) next.set('zone', zone);
      else next.delete('zone');
      return next;
    });
  };
  const handleResolve = async (id: number) => {
    setResolvedId(null);
    if (await resolve(id)) {
      setResolvedId(id);
      void overview.refresh();
    }
  };

  if (loading) return <AlertsSkeleton />;
  if (error && alerts.length === 0) return <ErrorState message={error} onRetry={() => { void refresh(); }} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-text">{t("Cảnh báo")} <span data-total-alerts className="rounded-full bg-coral/10 text-coral px-3 py-1 text-base">{alerts.length}</span></h1>
          <p className="mt-1 text-sm text-gray">{t("Theo dõi và xử lý cảnh báo tại các vùng canh tác.")}</p>
        </div>
        <button onClick={() => { void refresh(); }} disabled={refreshing} className="px-3 py-2 rounded-xl border border-border bg-surface text-text text-xs font-semibold cursor-pointer disabled:opacity-50">{refreshing ? t("Đang cập nhật…") : t("Làm mới")}</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 text-coral p-3 text-sm">{t("Không thể cập nhật cảnh báo.")} <button onClick={() => { void refresh(); }} className="underline cursor-pointer">{t("Thử lại")}</button></div>}
      {resolveError && <div role="alert" data-resolve-error className="fixed z-50 inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] lg:left-auto lg:w-96 rounded-xl border border-coral/40 bg-surface text-text p-4 shadow-lg flex items-start gap-3"><span className="text-sm flex-1">{resolveError}</span><button aria-label={t("Đóng thông báo lỗi")} onClick={dismissResolveError} className="text-coral cursor-pointer">✕</button></div>}
      <div aria-live="polite" className="text-xs text-teal">
        {pendingIds.length > 0 ? t("Đang lưu trạng thái xử lý…") : resolvedId !== null ? t("Đã xử lý cảnh báo #{0}.", [resolvedId]) : null}
      </div>

      <form onSubmit={event => event.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-border bg-surface">
        <div>
          <label htmlFor="zone-filter" className="block text-xs font-semibold text-gray mb-1.5">{t("Vùng canh tác")}</label>
          <select id="zone-filter" {...register('zone', { onChange: event => changeZone(event.target.value) })} value={zoneFilter} className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30">
            <option value="">{t("Tất cả vùng")}</option>
            {zoneFilter && !zoneCodes.includes(zoneFilter) && <option value={zoneFilter}>{zoneNames.get(zoneFilter) ?? zoneFilter}</option>}
            {zoneCodes.map(code => <option key={code} value={code}>{zoneNames.get(code) ?? code} ({code})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="source-filter" className="block text-xs font-semibold text-gray mb-1.5">{t("Nguồn cảnh báo")}</label>
          <select id="source-filter" {...register('source')} className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30">
            <option value="ALL">{t("Tất cả")}</option>
            <option value="HARD">{t("Cảnh báo cứng")}</option>
            <option value="AGENTIC">{t("Cảnh báo AI")}</option>
          </select>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div data-empty-state className="rounded-2xl border border-border bg-surface p-8 text-center">
          <span className={`material-symbols-outlined text-[36px] ${alerts.length === 0 ? 'text-teal' : 'text-gray'}`} aria-hidden="true">{alerts.length === 0 ? 'check_circle' : 'filter_alt_off'}</span>
          <h2 className="mt-3 font-semibold text-text">{alerts.length === 0 ? t("Chưa có cảnh báo nào") : t("Không có cảnh báo khớp bộ lọc")}</h2>
          <p className="mt-2 text-sm text-gray">{alerts.length === 0 ? t("Không có cảnh báo chưa xử lý. Hệ thống sẽ tiếp tục theo dõi các vùng canh tác.") : t("Thử chọn vùng khác hoặc thay đổi nguồn cảnh báo.")}</p>
          {alerts.length > 0 && <button onClick={() => { changeZone(''); resetField('source'); }} className="mt-4 text-sm font-semibold text-navy underline cursor-pointer">{t("Xóa bộ lọc")}</button>}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray">{t("Hiển thị")} {filtered.length}/{alerts.length} {t("cảnh báo · Mới nhất trước")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(alert => <AlertCard key={alert.id} alert={alert} zoneName={zoneNames.get(alert.zoneCode) ?? alert.zoneCode} onResolve={id => { void handleResolve(id); }} />)}
          </div>
        </>
      )}
    </div>
  );
}
