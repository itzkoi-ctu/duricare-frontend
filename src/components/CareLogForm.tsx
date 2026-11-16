import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { ACTION_TYPE_LABELS, type CareLogFormProps, type CareLogFormValues } from '../types/careLog';

interface ExtendedCareLogFormProps extends CareLogFormProps {
  zoneName?: string;
}

export default function CareLogForm({ onSubmit, onClose, isSaving, error, zoneName }: ExtendedCareLogFormProps) {
  useLanguage();
  const id = useId();
  const { register, handleSubmit, formState: { errors } } = useForm<CareLogFormValues>({
    defaultValues: { actionType: 'INSPECTION', note: '' },
  });

  return (
    <form
      aria-label={t('Ghi nhật ký mới')}
      onSubmit={handleSubmit(async values => {
        if (await onSubmit(values)) onClose();
      })}
      className="bg-surface rounded-xl border border-border p-5 shadow-sm flex flex-col gap-4"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1F5CA9] text-[20px]">edit_note</span>
          <h3 className="text-base font-semibold text-text">{t('Ghi nhật ký mới')}</h3>
        </div>
        {zoneName && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#eff4ff] dark:bg-[#1F5CA9]/15 text-[#1F5CA9] dark:text-[#60A5FA] border border-[#bfdbfe] dark:border-[#1F5CA9]/30">
            {zoneName}
          </span>
        )}
      </div>

      {/* Select: Hoạt động chăm sóc * */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-action`} className="text-xs font-semibold text-text">
          {t('Hoạt động chăm sóc')} <span className="text-coral">*</span>
        </label>
        <select
          id={`${id}-action`}
          {...register('actionType', { required: true })}
          disabled={isSaving}
          className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text focus:border-[#1F5CA9] focus:ring-2 focus:ring-[#1F5CA9]/20 transition-colors cursor-pointer"
        >
          {Object.entries(ACTION_TYPE_LABELS).map(([value, info]) => (
            <option key={value} value={value}>
              {t(info.label)}
            </option>
          ))}
        </select>
      </div>

      {/* Textarea: Ghi chú (tùy chọn) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-note`} className="text-xs font-medium text-text">
          {t('Ghi chú (tùy chọn)')}
        </label>
        <textarea
          id={`${id}-note`}
          rows={4}
          maxLength={255}
          {...register('note', { maxLength: { value: 255, message: 'Ghi chú tối đa 255 ký tự.' } })}
          disabled={isSaving}
          placeholder={t('Nhập nội dung hoạt động đã thực hiện...')}
          className="w-full p-3 border border-border rounded-lg bg-bg text-sm text-text placeholder:text-gray focus:border-[#1F5CA9] focus:ring-2 focus:ring-[#1F5CA9]/20 transition-colors resize-none"
        />
        {errors.note && (
          <p role="alert" className="text-xs text-coral mt-1">
            {t(errors.note.message ?? '')}
          </p>
        )}
      </div>

      {/* Helper text */}
      <p className="text-[12px] text-gray leading-snug">
        {t('Hệ thống tự động ghi nhận thời gian và người thực hiện.')}
      </p>

      {error && (
        <p role="alert" className="text-xs font-medium text-coral">
          {t(error)}
        </p>
      )}

      {/* Action buttons (44px height) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="h-11 flex-1 px-4 rounded-lg bg-[#1F5CA9] hover:bg-[#1a4e90] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">check</span>
          )}
          <span>{t(isSaving ? 'Đang lưu...' : 'Lưu nhật ký')}</span>
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={onClose}
          className="h-11 px-5 rounded-lg border border-border hover:bg-bg text-text text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {t('Hủy')}
        </button>
      </div>
    </form>
  );
}
