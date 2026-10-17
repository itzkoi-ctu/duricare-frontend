import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import type { ExpertProfile, TransitionFormValues } from '../types/expert';
import type { StatusActionType } from '../utils/expertStatus';

export type { StatusActionType };

interface ExpertStatusDialogProps {
  open: boolean;
  actionType: StatusActionType | null;
  profile: ExpertProfile;
  pending: boolean;
  conflictError: string | null;
  onConfirm: (version: number, reason: string) => Promise<boolean>;
  onReload: () => Promise<ExpertProfile | null | void>;
  onClose: () => void;
}

const ACTION_TITLES: Record<StatusActionType, string> = {
  verify: 'Xác minh chuyên gia',
  suspend: 'Tạm đình chỉ chuyên môn',
  reinstate: 'Khôi phục xác minh chuyên gia',
};

const ACTION_DESCRIPTIONS: Record<StatusActionType, string> = {
  verify: 'Xác nhận hồ sơ đạt tiêu chuẩn chuyên môn để cấp quyền tương ứng cho chuyên gia.',
  suspend: 'Tạm thời đình chỉ quyền chuyên môn của tài khoản chuyên gia này.',
  reinstate: 'Khôi phục lại trạng thái đã xác minh cho chuyên gia sau thời gian tạm đình chỉ.',
};

export default function ExpertStatusDialog({
  open,
  actionType,
  profile,
  pending,
  conflictError,
  onConfirm,
  onReload,
  onClose,
}: ExpertStatusDialogProps) {
  useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [capturedVersion, setCapturedVersion] = useState<number | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Capture profile version strictly at the moment the dialog transitions to open.
  // Do NOT update capturedVersion on profile prop changes while the dialog is open:
  // if profile changes in the background, versionMismatch triggers and ADMIN must review.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCapturedVersion(profile.version);
    } else {
      setCapturedVersion(null);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransitionFormValues>({
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      reset({ reason: '' });
    }
  }, [open, reset]);

  if (!open || !actionType) return null;

  const versionMismatch = capturedVersion !== null && capturedVersion !== profile.version;

  const handleFormSubmit = async (values: TransitionFormValues) => {
    if (capturedVersion === null || versionMismatch || pending) return;
    const success = await onConfirm(capturedVersion, values.reason);
    if (success) {
      reset({ reason: '' });
      setCapturedVersion(null);
      setPrevOpen(false);
      onClose();
    }
  };

  const handleReloadAndReview = async () => {
    setIsReloading(true);
    try {
      const updated = await onReload();
      if (updated && typeof updated === 'object' && 'version' in updated && typeof updated.version === 'number') {
        setCapturedVersion(updated.version);
      }
    } finally {
      setIsReloading(false);
    }
  };

  const handleCancel = () => {
    if (pending) return; // Prevent accidental close while submitting
    reset({ reason: '' });
    setCapturedVersion(null);
    setPrevOpen(false);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t(ACTION_TITLES[actionType])}
      onCancel={e => {
        if (pending) e.preventDefault();
        else handleCancel();
      }}
      className="fixed inset-0 m-auto w-[min(92vw,32rem)] max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex flex-col p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-text">{t(ACTION_TITLES[actionType])}</h2>
            <p className="text-xs text-gray leading-relaxed">{t(ACTION_DESCRIPTIONS[actionType])}</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleCancel}
            aria-label={t('Đóng')}
            className="min-h-9 min-w-9 flex items-center justify-center rounded-lg text-gray hover:text-text hover:bg-bg disabled:opacity-50 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="rounded-xl border border-border/80 bg-bg p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray">{t('Chuyên gia')}:</span>
            <span className="font-semibold text-text [overflow-wrap:anywhere]">{profile.fullName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray">{t('Email')}:</span>
            <span className="font-mono text-text [overflow-wrap:anywhere]">{profile.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray">{t('Phiên bản hồ sơ')}:</span>
            <span className="font-mono text-text">v{profile.version}</span>
          </div>
        </div>

        {/* 409 Conflict Banner or Version Mismatch Notice */}
        {(conflictError || versionMismatch) && (
          <div
            role="alert"
            className="rounded-xl border border-amber/40 bg-amber/10 p-3.5 text-xs text-text space-y-2.5"
          >
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber shrink-0 text-[18px]">
                warning
              </span>
              <p className="font-medium leading-relaxed">
                {t('Hồ sơ đã thay đổi. Vui lòng tải lại và kiểm tra trước khi thực hiện lại.')}
              </p>
            </div>
            <button
              type="button"
              data-testid="dialog-reload-review"
              disabled={isReloading}
              onClick={handleReloadAndReview}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface border border-border px-3 font-semibold text-text hover:bg-bg disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span className={`material-symbols-outlined text-sm ${isReloading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{t(isReloading ? 'Đang tải lại...' : 'Tải lại hồ sơ & kiểm tra')}</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="action-reason" className="mb-1.5 block text-xs font-semibold text-text">
              {t('Lý do thực hiện')} <span className="text-coral">*</span>
            </label>
            <textarea
              id="action-reason"
              rows={4}
              disabled={pending}
              placeholder={t('Nhập căn cứ chuyên môn hoặc lý do chi tiết...')}
              {...register('reason', {
                required: 'Vui lòng nhập lý do.',
                maxLength: { value: 4000, message: 'Lý do tối đa 4000 ký tự.' },
                validate: value => Boolean(value.trim()) || 'Vui lòng nhập lý do.',
              })}
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'action-reason-error' : undefined}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 resize-y min-h-[90px]"
            />
            {errors.reason && (
              <p id="action-reason-error" role="alert" className="mt-1 text-xs text-coral">
                {t(errors.reason.message || 'Vui lòng nhập lý do.')}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={pending}
              onClick={handleCancel}
              className="min-h-11 rounded-xl border border-border bg-bg px-4 text-xs font-semibold text-text hover:bg-surface disabled:opacity-50 cursor-pointer"
            >
              {t('Hủy')}
            </button>
            <button
              type="submit"
              disabled={pending || versionMismatch || Boolean(conflictError)}
              className={`min-h-11 flex items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold text-surface dark:text-bg disabled:opacity-50 cursor-pointer ${
                actionType === 'suspend' ? 'bg-coral' : 'bg-teal'
              }`}
            >
              {pending && (
                <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
              )}
              <span>{t(pending ? 'Đang xử lý...' : 'Xác nhận')}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
