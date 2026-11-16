import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { withdrawRevision, parseGovernanceError } from '../../api/governance';
import type { RevisionResponse } from '../../types/governance';

interface KnowledgeWithdrawModalProps {
  revision: RevisionResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRevision: RevisionResponse) => void;
  onReload?: () => Promise<{ source: unknown; revision: RevisionResponse | null } | RevisionResponse | unknown> | void;
  mustVerifyReload?: boolean;
  onIndeterminateError?: () => void;
}

export default function KnowledgeWithdrawModal({
  revision,
  isOpen,
  onClose,
  onSuccess,
  onReload,
  mustVerifyReload = false,
  onIndeterminateError,
}: KnowledgeWithdrawModalProps) {
  useLanguage();

  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState<boolean>(false);

  const openVersionRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  if (isOpen && openVersionRef.current === null) {
    openVersionRef.current = revision.version;
  } else if (!isOpen && openVersionRef.current !== null) {
    openVersionRef.current = null;
  }

  const capturedVersion = openVersionRef.current ?? revision.version;
  const versionMismatch = openVersionRef.current !== null && revision.version !== openVersionRef.current;

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      setReason('');
      setError(null);
      setIsReloading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 3 && trimmedReason.length <= 4000;

  const handleSyncVersion = () => {
    openVersionRef.current = revision.version;
    setError(null);
  };

  const handleReloadAndVerify = async () => {
    if (!onReload) return;
    const targetRevisionId = revision.id;
    setIsReloading(true);
    try {
      const res = await onReload();
      if (!isMountedRef.current || !isOpen || revision.id !== targetRevisionId) return;
      const freshRev =
        (res as { revision?: RevisionResponse | null })?.revision ??
        (res as RevisionResponse | null) ??
        revision;

      // If the withdraw mutation already committed on the server, revision is now WITHDRAWN
      if (freshRev && freshRev.status === 'WITHDRAWN') {
        onSuccess(freshRev);
        onClose();
        return;
      }

      // If revision is no longer in a withdrawable status (SUBMITTED / IN_REVIEW)
      if (freshRev && freshRev.status !== 'SUBMITTED' && freshRev.status !== 'IN_REVIEW') {
        onSuccess(freshRev);
        onClose();
        return;
      }

      if (freshRev && typeof freshRev.version === 'number') {
        openVersionRef.current = freshRev.version;
      }
      setError(null);
    } catch {
      if (!isMountedRef.current || !isOpen || revision.id !== targetRevisionId) return;
      setError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      if (isMountedRef.current) {
        setIsReloading(false);
      }
    }
  };

  const handleWithdraw = async () => {
    if (!isReasonValid || versionMismatch || isSubmitting || mustVerifyReload) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const targetRevisionId = revision.id;

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await withdrawRevision(revision.id, capturedVersion, trimmedReason, controller.signal);
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || revision.id !== targetRevisionId) {
        return;
      }
      onSuccess(updated);
      onClose();
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || revision.id !== targetRevisionId) {
        return;
      }
      const parsed = parseGovernanceError(err, t('Không thể rút hồ sơ thẩm định.'));
      setError(parsed.message);

      const errObj = err as { response?: unknown; code?: string };
      const isConflict =
        parsed.status === 409 ||
        parsed.code?.includes('conflict') ||
        parsed.code?.includes('stale_version') ||
        parsed.code?.includes('status_conflict');
      const isTimeout = !errObj?.response || errObj?.code === 'ECONNABORTED' || parsed.status === 504;

      if (isConflict || isTimeout) {
        onIndeterminateError?.();
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
      data-testid="withdraw-revision-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-xl max-w-[660px] w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-red-600 text-2xl">
              warning
            </span>
            <h2 id="withdraw-modal-title" className="text-base sm:text-lg font-semibold text-text">
              {t('Rút hồ sơ thẩm định')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-withdraw-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('Đóng')}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-gray hover:bg-surface-hover hover:text-text transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Warning Alert Box */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-lg flex items-start gap-3">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl mt-0.5 shrink-0"
            >
              warning
            </span>
            <p className="text-xs text-text leading-relaxed">
              {t('Rút hồ sơ khỏi quy trình thẩm định. Phiên bản được lưu ở trạng thái')}{' '}
              <strong className="font-semibold text-red-700 dark:text-red-400">
                {t('Đã rút (WITHDRAWN)')}
              </strong>{' '}
              {t('trong lịch sử. Để chỉnh sửa tiếp sau này, vui lòng tạo một bản nháp mới.')}
            </p>
          </div>

          {/* Form Field */}
          <div>
            <label
              htmlFor="withdraw-reason"
              className="block text-xs font-semibold text-text mb-1.5"
            >
              {t('Lý do rút hồ sơ')} <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              id="withdraw-reason"
              data-testid="withdraw-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('Nhập lý do cụ thể cần rút hồ sơ để ghi nhận vào lịch sử phiên bản...')}
              className="w-full rounded-lg border border-border bg-surface dark:bg-bg p-3 text-xs text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
            />
            <div className="flex justify-between items-center mt-1.5 text-xs text-gray">
              <span>{t('(Tối thiểu 3 ký tự)')}</span>
              <span
                className={`tabular-nums ${
                  trimmedReason.length > 4000 ? 'text-red-600 font-bold' : ''
                }`}
              >
                {trimmedReason.length} / 4000 {t('ký tự')}
              </span>
            </div>
          </div>

          {/* Version mismatch warning */}
          {versionMismatch && (
            <div
              data-testid="withdraw-version-mismatch"
              className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Phiên bản đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t(
                  'Máy chủ hiện có phiên bản v{0} (khác v{1}). Vui lòng cập nhật trước khi xác nhận.',
                  [revision.version, capturedVersion]
                )}
              </p>
              <button
                type="button"
                onClick={handleSyncVersion}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer text-xs"
              >
                {t('Cập nhật lên v{0}', [revision.version])}
              </button>
            </div>
          )}

          {/* Error banner */}
          {(error || mustVerifyReload) && (
            <div
              data-testid="withdraw-error-banner"
              className="p-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-base text-red-600 dark:text-red-400 shrink-0"
                >
                  error
                </span>
                <span>
                  {error ||
                    t(
                      'Thao tác trước đó gặp sự cố hoặc phiên bản chưa xác định. Vui lòng tải lại và xác minh trước khi tiếp tục.'
                    )}
                </span>
              </div>
              {mustVerifyReload && onReload && (
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="withdraw-verify-reload-button"
                    onClick={handleReloadAndVerify}
                    disabled={isReloading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#dc2626] text-white text-xs font-semibold hover:bg-[#b91c1c] disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <span
                      aria-hidden="true"
                      className={`material-symbols-outlined text-sm ${
                        isReloading ? 'animate-spin' : ''
                      }`}
                    >
                      refresh
                    </span>
                    <span>
                      {isReloading
                        ? t('Đang tải lại dữ liệu...')
                        : t('Tải lại và đồng bộ phiên bản mới nhất')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Technical disclosure */}
          <details className="group border border-border rounded-lg text-xs">
            <summary className="px-3 py-2 cursor-pointer bg-surface font-medium text-gray flex items-center justify-between select-none">
              <span>{t('Chi tiết kỹ thuật & DTO tham chiếu')}</span>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-sm transition-transform group-open:rotate-180"
              >
                expand_more
              </span>
            </summary>
            <div className="p-3 border-t border-border font-mono bg-slate-50 dark:bg-bg text-gray space-y-1">
              <div>action: WITHDRAW_SUBMISSION</div>
              <div>targetEntity: RevisionResponse#{revision.id}</div>
              <div>headVersion: v{revision.version}</div>
              <div>expectedStatusTransition: SUBMITTED -&gt; WITHDRAWN</div>
            </div>
          </details>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-surface-hover/30 border-t border-border flex items-center justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="h-11 px-5 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface-hover transition-colors shadow-xs"
          >
            {t('Hủy')}
          </button>
          <button
            type="button"
            data-testid="confirm-withdraw-button"
            onClick={handleWithdraw}
            disabled={
              !isReasonValid || versionMismatch || isSubmitting || isReloading || mustVerifyReload
            }
            className="h-11 px-6 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-medium shadow-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang xử lý...') : t('Rút hồ sơ')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
