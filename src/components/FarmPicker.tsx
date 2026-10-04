import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import type { FarmPickerProps } from '../types/zoneManagement';

export default function FarmPicker({ farms, value, onChange }: FarmPickerProps) {
  useLanguage();
  return <div><label htmlFor="zone-management-farm" className="mb-1.5 block text-xs font-semibold text-text">{t('Nông trại')}</label>
    <select id="zone-management-farm" value={value} onChange={event => onChange(event.target.value)} className="min-h-11 w-full md:max-w-sm rounded-xl border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40">
      <option value="">{t('Tất cả nông trại')}</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
    </select></div>;
}
