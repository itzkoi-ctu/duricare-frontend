import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { ACTION_TYPE_LABELS, type CareLogFormProps, type CareLogFormValues } from '../types/careLog';

export default function CareLogForm({ onSubmit, onClose, isSaving, error }: CareLogFormProps) {
  useLanguage();
  const id = useId();
  const { register, handleSubmit, formState: { errors } } = useForm<CareLogFormValues>({ defaultValues: { actionType: 'INSPECTION', note: '' } });
  return <form aria-label={t('Ghi nhật ký mới')} onSubmit={handleSubmit(async values => { if (await onSubmit(values)) onClose(); })}
    className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm space-y-5">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2">
      <span aria-hidden="true" className="material-symbols-outlined text-teal">edit_note</span><div>
        <h2 className="text-base font-bold text-text">{t('Ghi nhật ký mới')}</h2>
        <p className="mt-1 text-xs text-gray">{t('Ghi lại hoạt động chăm sóc khu vườn.')}</p></div></div>
      <button type="button" disabled={isSaving} onClick={onClose} aria-label={t('Đóng biểu mẫu')} className="size-11 shrink-0 rounded-lg text-gray hover:bg-bg disabled:opacity-50 cursor-pointer"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
    </div>
    <div><label htmlFor={id + '-action'} className="mb-2 block text-xs font-semibold text-text">{t('Loại hoạt động')}</label>
      <select id={id + '-action'} {...register('actionType', { required: true })} disabled={isSaving} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/30">
        {Object.entries(ACTION_TYPE_LABELS).map(([value, info]) => <option key={value} value={value}>{t(info.label)}</option>)}
      </select></div>
    <div><label htmlFor={id + '-note'} className="mb-2 block text-xs font-semibold text-text">{t('Ghi chú')}</label>
      <textarea id={id + '-note'} rows={5} maxLength={255} {...register('note', { maxLength: { value: 255, message: 'Ghi chú tối đa 255 ký tự.' } })} disabled={isSaving}
        placeholder={t('Mô tả công việc đã thực hiện...')} className="w-full resize-y rounded-xl border border-border bg-bg p-3 text-sm text-text placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-navy/30" />
      {errors.note && <p role="alert" className="mt-1 text-xs text-coral">{t(errors.note.message ?? '')}</p>}</div>
    <p className="text-xs text-gray">{t('Thời gian và người thực hiện được ghi tự động khi lưu.')}</p>
    {error && <p role="alert" className="text-sm text-coral">{t(error)}</p>}
    <button type="submit" disabled={isSaving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-surface dark:text-bg disabled:opacity-50 cursor-pointer">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">save</span>{t(isSaving ? 'Đang lưu...' : 'Lưu nhật ký chăm sóc')}
    </button>
  </form>;
}
