import { Link, useSearchParams } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import useZoneManagement from '../hooks/useZoneManagement';
import FarmPicker from '../components/FarmPicker';
import ZoneManagementList from '../components/ZoneManagementList';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';

export default function ZoneManagementPage() {
  useLanguage();
  const [params, setParams] = useSearchParams();
  const parsedId = Number(params.get('farmId'));
  const farmId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const state = useZoneManagement();
  const zones = state.zones.filter(zone => farmId === null || zone.farmId === farmId);
  return <div className="space-y-5">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div>
      <h1 className="text-xl md:text-2xl font-bold text-text">{t('Quản lý khu vực')}</h1><p className="mt-1 text-xs md:text-sm text-gray">{t('Cấu hình khu vực và cây đại diện cho nông trại.')}</p>
    </div><Link to={`/settings/zones/new${farmId ? `?farmId=${farmId}` : ''}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-surface dark:text-bg">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">add</span>{t('Tạo khu vực mới')}</Link></div>
    {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} onRetry={state.retry} /> : <>
      <FarmPicker farms={state.farms} value={farmId ? String(farmId) : ''} onChange={value => { const next = new URLSearchParams(params); if (value) next.set('farmId', value); else next.delete('farmId'); setParams(next, { replace: true }); }} />
      <p className="text-xs text-gray">{t('{0} khu vực', [zones.length])}</p>
      {zones.length ? <ZoneManagementList zones={zones} /> : <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <span aria-hidden="true" className="material-symbols-outlined text-4xl text-gray">yard</span><h2 className="mt-3 text-base font-bold text-text">{t('Chưa có khu vực nào')}</h2>
        <p className="mt-2 text-sm text-gray">{t('Tạo khu vực đầu tiên để bắt đầu theo dõi cảm biến.')}</p></div>}
    </>}
  </div>;
}
