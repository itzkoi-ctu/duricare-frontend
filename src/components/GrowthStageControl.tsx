import { useId, useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../types/zone';
import type { GrowthStageControlProps, GrowthStageFormValues } from '../types/growthStage';

export default function GrowthStageControl({ stage, treeId, isSaving, error, saved, onSave, onOpen }: GrowthStageControlProps) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GrowthStageFormValues>();

  const stageLabel = stage ? GROWTH_STAGE_LABELS[stage] : 'Chưa cập nhật';

  // Keyboard escape listener and focus trap inside modal dialog
  useEffect(() => {
    if (!open) return;

    // Focus the select dropdown on modal open
    const focusTimer = setTimeout(() => {
      selectRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isSaving]);

  const handleOpen = () => {
    reset({ growthStage: stage ?? 'KIEN_THIET_CO_BAN' });
    onOpen();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <div className="inline-flex items-center gap-2 bg-surface dark:bg-surface px-2.5 py-1 rounded-lg border border-border text-[13px] shadow-2xs">
        <span className="text-gray text-xs">{t('Giai đoạn:')}</span>
        <strong className="font-semibold text-text text-xs">{t(stageLabel)}</strong>
        <button
          ref={triggerRef}
          type="button"
          disabled={isSaving || treeId === null}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={handleOpen}
          className="text-[#0072a8] dark:text-[#60A5FA] font-medium hover:underline text-[12px] ml-1 disabled:opacity-40 disabled:hover:no-underline cursor-pointer"
          title={treeId === null ? t('Khu vực chưa có cây đại diện để đổi giai đoạn.') : t('Đổi giai đoạn')}
        >
          {t('Đổi giai đoạn')}
        </button>
      </div>

      {saved && (
        <span role="status" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">check_circle</span>
          {t('Đã cập nhật giai đoạn sinh trưởng.')}
        </span>
      )}

      {/* Accessible Modal Dialog */}
      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={e => { if (e.target === e.currentTarget && !isSaving) handleClose(); }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-dialog-title`}
            className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[#1F5CA9] text-xl">psychiatry</span>
                <h3 id={`${id}-dialog-title`} className="text-base font-bold text-text">
                  {t('Đổi giai đoạn sinh trưởng')}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleClose}
                aria-label={t('Đóng')}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray hover:bg-bg cursor-pointer disabled:opacity-40"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form
              id={`${id}-form`}
              onSubmit={handleSubmit(async values => {
                if (await onSave(values.growthStage)) {
                  handleClose();
                }
              })}
              className="space-y-4"
            >
              <div>
                <label htmlFor={`${id}-stage`} className="block text-xs font-semibold text-text mb-1.5">
                  {t('Giai đoạn sinh trưởng')} <span className="text-coral">*</span>
                </label>
                <select
                  id={`${id}-stage`}
                  disabled={isSaving}
                  {...(() => {
                    const { ref: formRef, ...rest } = register('growthStage', {
                      required: 'Vui lòng chọn giai đoạn.',
                      validate: value => value in GROWTH_STAGE_LABELS || 'Vui lòng chọn giai đoạn.',
                    });
                    return {
                      ...rest,
                      ref: (el: HTMLSelectElement | null) => {
                        formRef(el);
                        selectRef.current = el;
                      },
                    };
                  })()}
                  aria-invalid={Boolean(errors.growthStage)}
                  className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-[#1F5CA9]/30 disabled:opacity-60 cursor-pointer"
                >
                  {(Object.entries(GROWTH_STAGE_LABELS) as [GrowthStage, string][]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {t(label)}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray leading-relaxed">
                  {t('Khoảng mục tiêu độ ẩm đất sẽ được cập nhật theo giai đoạn mới.')}
                </p>
                {(error || errors.growthStage) && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-coral">
                    {t(error ?? errors.growthStage?.message ?? 'Vui lòng chọn giai đoạn.')}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/80">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleClose}
                  className="min-h-11 px-4 rounded-xl border border-border hover:bg-bg text-xs font-semibold text-text cursor-pointer disabled:opacity-50"
                >
                  {t('Huỷ')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-11 px-5 rounded-xl bg-[#1F5CA9] text-white hover:bg-[#1a4e90] text-xs font-semibold cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                >
                  {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>{t(isSaving ? 'Đang lưu...' : 'Xác nhận')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
