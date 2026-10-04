import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import type { ZoneFormValues } from '../types/zone';
import type { ZoneFormProps } from '../types/zoneManagement';

const inputStyle = 'min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';
const labelStyle = 'mb-1.5 block text-xs font-semibold text-text';

export default function ZoneForm({ farms, zones, zone, tree, initialFarmId, isSaving, error, onSave }: ZoneFormProps) {
  useLanguage();
  const id = useId();
  const selected = zone?.farmId ?? initialFarmId;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ZoneFormValues>({ defaultValues: {
    farmId: selected && farms.some(farm => farm.id === selected) ? String(selected) : '',
    name: zone?.name ?? '', code: zone?.code ?? '', area: zone?.area ?? Number.NaN,
    soilType: zone?.soilType ?? '', variety: tree?.variety ?? '', plantingDate: tree?.plantingDate ?? '',
  } });
  const busy = isSaving || isSubmitting;
  const required = 'Vui lòng điền trường này.';
  const requiredText = { required, maxLength: { value: 255, message: 'Tối đa 255 ký tự.' }, validate: (value: string) => Boolean(value.trim()) || required };
  const fieldError = (field: keyof ZoneFormValues) => errors[field] && <p id={`${id}-${field}-error`} role="alert" className="mt-1 text-xs text-coral">{t(errors[field]?.message ?? required)}</p>;
  const access = (field: keyof ZoneFormValues) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby':
    [field === 'code' ? `${id}-code-help` : field === 'plantingDate' ? `${id}-date-help` : '', errors[field] ? `${id}-${field}-error` : ''].filter(Boolean).join(' ') || undefined });
  return <form noValidate aria-label={t(zone ? 'Sửa khu vực' : 'Tạo khu vực mới')} onSubmit={handleSubmit(values => onSave({
    farmId: Number(values.farmId), name: values.name.trim(), code: values.code, area: values.area,
    soilType: values.soilType.trim(), variety: values.variety.trim(), plantingDate: values.plantingDate || null,
  }))} className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm">
    <div className="mb-5 flex items-center gap-2 border-b border-border pb-3"><span aria-hidden="true" className="material-symbols-outlined text-navy">yard</span><h2 className="text-sm font-bold text-text">{t('Thông tin khu vực')}</h2></div>
    <fieldset disabled={busy} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      <div className="md:col-span-2"><label htmlFor={`${id}-farm`} className={labelStyle}>{t('Nông trại')}</label>
        {zone ? <><input id={`${id}-farm`} value={zone.farmName ?? ''} readOnly className={inputStyle} /><input type="hidden" {...register('farmId', { required, validate: value => farms.some(farm => String(farm.id) === value) || 'Vui lòng chọn nông trại.' })} /></>
          : <select id={`${id}-farm`} {...register('farmId', { required: 'Vui lòng chọn nông trại.', validate: value => farms.some(farm => String(farm.id) === value) || 'Vui lòng chọn nông trại.' })} {...access('farmId')} className={inputStyle}>
              <option value="">{t('Chọn nông trại')}</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </select>}{fieldError('farmId')}</div>
      <div><label htmlFor={`${id}-name`} className={labelStyle}>{t('Tên khu vực')}</label><input id={`${id}-name`} {...register('name', requiredText)} {...access('name')} className={inputStyle} />{fieldError('name')}</div>
      <div><label htmlFor={`${id}-code`} className={labelStyle}>{t('Mã khu vực')}</label><input id={`${id}-code`} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...register('code', {
        required, maxLength: { value: 255, message: 'Tối đa 255 ký tự.' },
        pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.' },
        validate: value => !zones.some(item => item.id !== zone?.id && item.code === value) || 'Mã khu vực đã được sử dụng. Vui lòng chọn mã khác.',
      })} {...access('code')} className={inputStyle} />{fieldError('code')}
        <p id={`${id}-code-help`} className="mt-2 text-xs leading-relaxed text-gray">{t('Mã phải khớp chính xác zoneId trong firmware của thiết bị, kể cả chữ hoa/thường. Đây là khoá liên kết dữ liệu cảm biến.')}</p>
        {zone && <p className="mt-2 rounded-lg bg-amber/10 p-2 text-xs leading-relaxed text-text">{t('Nếu đổi mã, hãy cập nhật zoneId trong firmware để tiếp tục nhận dữ liệu.')}</p>}</div>
      <div><label htmlFor={`${id}-area`} className={labelStyle}>{t('Diện tích')}</label><input id={`${id}-area`} type="number" min="0" step="any" {...register('area', {
        valueAsNumber: true, required, validate: value => Number.isFinite(value) && value > 0 || 'Diện tích phải lớn hơn 0.',
      })} {...access('area')} className={inputStyle} />{fieldError('area')}</div>
      <div><label htmlFor={`${id}-soil`} className={labelStyle}>{t('Loại đất')}</label><input id={`${id}-soil`} {...register('soilType', requiredText)} {...access('soilType')} className={inputStyle} />{fieldError('soilType')}</div>
      <div><label htmlFor={`${id}-variety`} className={labelStyle}>{t('Giống cây trồng')}</label><input id={`${id}-variety`} list={`${id}-varieties`} {...register('variety', requiredText)} {...access('variety')} className={inputStyle} />
        <datalist id={`${id}-varieties`}><option value="Monthong" /><option value="Ri6" /></datalist>{fieldError('variety')}</div>
      <div><label htmlFor={`${id}-date`} className={labelStyle}>{t('Ngày trồng (không bắt buộc)')}</label><input id={`${id}-date`} type="date" {...register('plantingDate', {
        validate: value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) || 'Ngày trồng không hợp lệ.',
      })} {...access('plantingDate')} className={inputStyle} />{fieldError('plantingDate')}
        <p id={`${id}-date-help`} className="mt-2 text-xs leading-relaxed text-gray">{t(zone ? 'Để trống để giữ nguyên ngày trồng hiện tại.' : 'Để trống, hệ thống lấy ngày hôm nay khi tạo cây đại diện.')}</p></div>
    </fieldset>
    <p className="mt-5 rounded-xl bg-bg p-3 text-xs leading-relaxed text-gray">{t(zone ? 'Giai đoạn sinh trưởng được giữ nguyên khi lưu thông tin khu vực.' : 'Hệ thống tự tạo 1 cây đại diện và 3 cảm biến: nhiệt độ, độ ẩm không khí, độ ẩm đất.')}</p>
    {error && <p role="alert" className="mt-3 text-sm text-coral">{t(error)}</p>}
    <button disabled={busy} type="submit" className="mt-4 flex min-h-11 w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-surface dark:text-bg disabled:opacity-50 cursor-pointer">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">{zone ? 'save' : 'add'}</span>{t(busy ? 'Đang lưu...' : zone ? 'Lưu thay đổi' : 'Tạo khu vực')}
    </button>
  </form>;
}
