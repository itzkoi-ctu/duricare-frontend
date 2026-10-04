import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../types/zone';
import type { GrowthStageControlProps, GrowthStageFormValues } from '../types/growthStage';

export default function GrowthStageControl({ stage, treeId, isSaving, error, saved, onSave, onOpen }: GrowthStageControlProps) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const id = useId();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GrowthStageFormValues>();
  return <div className="mt-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">🌱 {t(stage ? GROWTH_STAGE_LABELS[stage] : 'Chưa cập nhật')}</span>
      <button type="button" disabled={isSaving || treeId === null} aria-expanded={open} aria-controls={`${id}-form`}
        onClick={() => { if (!open) { reset({ growthStage: stage ?? 'KIEN_THIET_CO_BAN' }); onOpen(); } setOpen(!open); }}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy dark:text-blue hover:bg-bg disabled:opacity-50 cursor-pointer">
        <span aria-hidden="true" className="material-symbols-outlined text-base">edit</span>{t('Đổi giai đoạn')}
      </button>
    </div>
    {treeId === null && <p className="mt-1 text-xs text-gray">{t('Khu vực chưa có cây đại diện để đổi giai đoạn.')}</p>}
    {open && <form id={`${id}-form`} aria-label={t('Đổi giai đoạn sinh trưởng')} onSubmit={handleSubmit(async values => { if (await onSave(values.growthStage)) setOpen(false); })}
      className="mt-2 max-w-lg rounded-xl border border-border bg-bg p-3">
      <label htmlFor={`${id}-stage`} className="mb-2 block text-xs font-semibold text-text">{t('Giai đoạn sinh trưởng')}</label>
      <select id={`${id}-stage`} disabled={isSaving} {...register('growthStage', { required: 'Vui lòng chọn giai đoạn.', validate: value => value in GROWTH_STAGE_LABELS || 'Vui lòng chọn giai đoạn.' })}
        aria-invalid={Boolean(errors.growthStage)} className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60">
        {(Object.entries(GROWTH_STAGE_LABELS) as [GrowthStage, string][]).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
      </select>
      <p className="mt-2 text-xs leading-relaxed text-gray">{t('Khoảng mục tiêu độ ẩm đất sẽ được cập nhật theo giai đoạn mới.')}</p>
      {(error || errors.growthStage) && <p role="alert" className="mt-2 text-xs text-coral">{t(error ?? errors.growthStage?.message ?? 'Vui lòng chọn giai đoạn.')}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={isSaving} className="min-h-11 rounded-lg bg-navy px-4 text-xs font-semibold text-surface dark:text-bg disabled:opacity-50 cursor-pointer">{t(isSaving ? 'Đang lưu...' : 'Xác nhận')}</button>
        <button type="button" disabled={isSaving} onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-border px-4 text-xs font-semibold text-text disabled:opacity-50 cursor-pointer">{t('Huỷ')}</button>
      </div>
    </form>}
    {saved && <p role="status" className="mt-2 text-xs font-semibold text-teal">{t('Đã cập nhật giai đoạn sinh trưởng.')}</p>}
  </div>;
}
