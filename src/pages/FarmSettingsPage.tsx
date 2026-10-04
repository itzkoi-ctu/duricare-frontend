import { useSearchParams } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import useFarmSettings from '../hooks/useFarmSettings';
import FarmSettingsForm from '../components/FarmSettingsForm';
import { useOverviewContext } from '../context/OverviewContext';

export default function FarmSettingsPage() {
  useLanguage();
  const [params, setParams] = useSearchParams();
  const parsedId = Number(params.get('farmId'));
  const farmId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const settings = useFarmSettings(farmId);
  const overview = useOverviewContext();
  return <div className="mx-auto max-w-3xl space-y-4 md:space-y-6">
    <div><h1 className="text-xl md:text-2xl font-bold text-text">{t('Cài đặt nông trại')}</h1>
      <p className="mt-1 text-xs md:text-sm text-gray">{t('Cập nhật thông tin và vị trí vườn để theo dõi thời tiết.')}</p></div>
    {settings.farms.length > 0 && <div><label htmlFor="settings-farm" className="mb-1.5 block text-xs font-semibold text-text">{t('Nông trại')}</label>
      <select id="settings-farm" value={farmId ?? ''} disabled={settings.isSaving} onChange={event => {
        const next = new URLSearchParams(params);
        if (event.target.value) next.set('farmId', event.target.value); else next.delete('farmId');
        setParams(next, { replace: true });
      }} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60">
        <option value="">{t('Chọn nông trại')}</option>
        {settings.farms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></div>}
    {settings.loading ? <div role="status" aria-label={t('Đang tải...')} className="rounded-2xl border border-border bg-surface p-5 space-y-5 animate-pulse">
      {[0, 1, 2, 3].map(item => <div key={item} className="space-y-2"><div className="h-3 w-24 rounded bg-border" /><div className="h-11 rounded-xl bg-border/60" /></div>)}<span className="sr-only">{t('Đang tải...')}</span>
    </div> : settings.error ? <div role="alert" className="rounded-2xl border border-coral/30 bg-surface p-5"><p className="text-sm text-coral">{t(settings.error)}</p>
      <button onClick={settings.retry} className="mt-3 min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-surface dark:text-bg cursor-pointer">{t('Thử lại')}</button></div>
    : settings.farm ? <FarmSettingsForm farm={settings.farm} isSaving={settings.isSaving} error={settings.saveError} onSave={async request => {
      const success = await settings.save(request);
      if (success) void overview.refresh();
      return success;
    }} /> : <div className="rounded-2xl border border-border bg-surface p-6 text-center">
      <span aria-hidden="true" className="material-symbols-outlined text-4xl text-gray">agriculture</span>
      <p className="mt-3 text-sm text-gray">{t(settings.farms.length ? 'Chọn nông trại để chỉnh sửa cài đặt.' : 'Chưa có nông trại nào.')}</p></div>}
    {settings.saved && <div role="status" className="fixed z-50 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-8 left-4 right-4 md:left-auto md:right-8 flex items-center gap-2 rounded-xl border border-teal/40 bg-surface p-4 text-sm font-semibold text-text shadow-lg">
      <span aria-hidden="true" className="material-symbols-outlined text-teal">check_circle</span>{t('Đã lưu cài đặt nông trại.')}</div>}
  </div>;
}
