import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { GROWTH_STAGE_LABELS } from '../types/zone';
import type { ZoneManagementListProps } from '../types/zoneManagement';

export default function ZoneManagementList({ zones }: ZoneManagementListProps) {
  useLanguage();
  return <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div aria-hidden="true" className="hidden md:grid grid-cols-[1.5fr_1.2fr_1fr_5rem] gap-4 border-b border-border bg-bg px-5 py-3 text-xs font-semibold text-gray">
      <span>{t('Khu vực / Mã')}</span><span>{t('Giai đoạn')}</span><span>{t('Giống cây trồng')}</span><span>{t('Thao tác')}</span>
    </div>
    <ul className="divide-y divide-border">{zones.map(zone => <li key={zone.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_1.2fr_1fr_5rem] items-center gap-3 md:gap-4 p-4 md:px-5">
      <div className="min-w-0"><p className="break-words text-sm font-bold text-text">{zone.name || zone.code}</p>
        <p className="mt-1 break-all text-xs font-mono text-gray">{zone.code}</p><p className="mt-1 text-xs text-gray">{zone.farmName || t('Chưa cập nhật')}</p></div>
      <span className="col-start-1 row-start-2 md:col-auto md:row-auto justify-self-start rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
        {t(zone.growthStage ? GROWTH_STAGE_LABELS[zone.growthStage] : 'Chưa cập nhật')}</span>
      <p className="col-start-1 row-start-3 md:col-auto md:row-auto text-xs md:text-sm text-gray"><span className="md:hidden">{t('Giống')}: </span>{zone.variety || t('Chưa cập nhật')}</p>
      <Link aria-label={t('Sửa khu vực {0}', [zone.code])} to={`/settings/zones/${encodeURIComponent(zone.code)}/edit${zone.farmId ? `?farmId=${zone.farmId}` : ''}`}
        className="col-start-2 row-start-1 row-span-3 md:col-auto md:row-auto md:row-span-1 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-bg px-3 text-xs font-semibold text-navy dark:text-blue hover:border-navy/50">
        <span aria-hidden="true" className="material-symbols-outlined text-lg">edit</span>{t('Sửa')}
      </Link>
    </li>)}</ul>
  </div>;
}
