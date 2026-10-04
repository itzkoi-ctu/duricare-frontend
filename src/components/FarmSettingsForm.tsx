import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import type { FarmRequest, FarmSettingsFormProps } from '../types/farm';

const inputStyle = 'min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60';
const labelStyle = 'mb-1.5 block text-xs font-semibold text-text';

export default function FarmSettingsForm({ farm, isSaving, error, onSave }: FarmSettingsFormProps) {
  useLanguage();
  const id = useId();
  const { register, reset, handleSubmit, formState: { errors } } = useForm<FarmRequest>();
  useEffect(() => {
    reset({ name: farm.name, location: farm.location ?? '', area: farm.area ?? Number.NaN,
      latitude: farm.latitude ?? Number.NaN, longitude: farm.longitude ?? Number.NaN });
  }, [farm, reset]);
  const required = 'Vui lòng điền trường này.';
  const fieldError = (field: keyof FarmRequest) => errors[field] && <p id={`${id}-${field}-error`} role="alert" className="mt-1 text-xs text-coral">{t(errors[field]?.message ?? required)}</p>;
  const accessibility = (field: keyof FarmRequest) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined });
  const validNumber = (value: number) => Number.isFinite(value) || 'Vui lòng nhập một số hợp lệ.';
  return <form noValidate aria-label={t('Cài đặt nông trại')} onSubmit={handleSubmit(values => onSave({ ...values, name: values.name.trim(), location: values.location.trim() }))}
    className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm">
    <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
      <span aria-hidden="true" className="material-symbols-outlined text-navy">agriculture</span>
      <h2 className="text-sm font-bold text-text">{t('Thông tin nông trại')}</h2>
    </div>
    <fieldset disabled={isSaving} className="space-y-3 md:space-y-5">
      <div><label htmlFor={`${id}-name`} className={labelStyle}>{t('Tên nông trại')}</label>
        <input id={`${id}-name`} autoComplete="organization" {...register('name', { required, validate: value => Boolean(value.trim()) || required, maxLength: { value: 255, message: 'Tối đa 255 ký tự.' } })} {...accessibility('name')} className={inputStyle} />{fieldError('name')}</div>
      <div><label htmlFor={`${id}-location`} className={labelStyle}>{t('Địa chỉ')}</label>
        <input id={`${id}-location`} autoComplete="street-address" {...register('location', { required, validate: value => Boolean(value.trim()) || required, maxLength: { value: 255, message: 'Tối đa 255 ký tự.' } })} {...accessibility('location')} className={inputStyle} />{fieldError('location')}</div>
      <div className="md:max-w-xs"><label htmlFor={`${id}-area`} className={labelStyle}>{t('Diện tích')}</label>
        <input id={`${id}-area`} type="number" step="any" min="0" {...register('area', { valueAsNumber: true, required, validate: value => validNumber(value) === true ? value > 0 || 'Diện tích phải lớn hơn 0.' : validNumber(value) })} {...accessibility('area')} className={inputStyle} />{fieldError('area')}</div>
      <div className="border-t border-border pt-3 md:pt-5">
        <h3 className="mb-3 text-sm font-bold text-text">{t('Toạ độ')}</h3>
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <div><label htmlFor={`${id}-latitude`} className={labelStyle}>{t('Vĩ độ')}</label>
            <input id={`${id}-latitude`} type="number" step="any" min="-90" max="90" {...register('latitude', { valueAsNumber: true, required, validate: validNumber, min: { value: -90, message: 'Vĩ độ phải từ -90 đến 90.' }, max: { value: 90, message: 'Vĩ độ phải từ -90 đến 90.' } })} {...accessibility('latitude')} className={inputStyle} />{fieldError('latitude')}</div>
          <div><label htmlFor={`${id}-longitude`} className={labelStyle}>{t('Kinh độ')}</label>
            <input id={`${id}-longitude`} type="number" step="any" min="-180" max="180" {...register('longitude', { valueAsNumber: true, required, validate: validNumber, min: { value: -180, message: 'Kinh độ phải từ -180 đến 180.' }, max: { value: 180, message: 'Kinh độ phải từ -180 đến 180.' } })} {...accessibility('longitude')} className={inputStyle} />{fieldError('longitude')}</div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray">{t('Lấy toạ độ từ Google Maps: bấm giữ vị trí vườn trên bản đồ')}</p>
      </div>
    </fieldset>
    {error && <p role="alert" className="mt-3 text-sm text-coral">{t(error)}</p>}
    <button type="submit" disabled={isSaving} className="mt-4 flex min-h-11 w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-surface dark:text-bg disabled:opacity-50 cursor-pointer">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">save</span>{t(isSaving ? 'Đang lưu...' : 'Lưu thay đổi')}
    </button>
  </form>;
}
