import { useState, useRef, useEffect } from 'react';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import { retryPublication, retryCleanupJob, parsePublicationError } from '../../../api/publication';
import type {
  PublicationHead,
  RetryRequest,
  MutationReceipt,
  JobKind,
  IndeterminateOperation,
} from '../../../types/publication';

interface RetryPublicationModalProps {
  targetId: string; // publicationId or jobId
  kind: JobKind; // INDEX or CLEANUP
  head: PublicationHead;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receipt: MutationReceipt) => void;
  onReloadHead?: () => Promise<PublicationHead | unknown>;
  indeterminateLock?: boolean;
  onIndeterminateError?: (op?: IndeterminateOperation) => void;
  onVerifyReceipt?: () => Promise<unknown>;
  preservedRequestId?: string;
  preservedReason?: string;
}

export default function RetryPublicationModal({
  targetId,
  kind,
  head,
  title,
  isOpen,
  onClose,
  onSuccess,
  onReloadHead,
  indeterminateLock = false,
  onIndeterminateError,
  onVerifyReceipt,
  preservedRequestId,
  preservedReason,
}: RetryPublicationModalProps) {
  useLanguage();

  const [reason, setReason] = useState<string>(preservedReason || '');
  const [requestId, setRequestId] = useState<string>(preservedRequestId || '');
  const [currentHeadVersion, setCurrentHeadVersion] = useState<number>(head.version);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isConflict, setIsConflict] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const modalSessionRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isConflict) {
      setCurrentHeadVersion(head.version);
    }
  }, [head.version, isConflict]);

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      modalSessionRef.current += 1;
      if (preservedRequestId) {
        setRequestId(preservedRequestId);
      } else {
        setRequestId(crypto.randomUUID());
      }
      if (preservedReason !== undefined) {
        setReason(preservedReason);
      }
      setCurrentHeadVersion(head.version);
      setGeneralError(null);
      setFieldErrors({});
      setIsConflict(false);
      setIsSubmitting(false);
      setIsReloading(false);
    } else {
      modalSessionRef.current += 1;
      abortControllerRef.current?.abort();
      setGeneralError(null);
      setFieldErrors({});
      setIsConflict(false);
      setIsSubmitting(false);
      setIsReloading(false);
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [isOpen, head.version, preservedRequestId, preservedReason]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 1 && trimmedReason.length <= 4000;
  const canSubmit = isReasonValid && !isSubmitting && !indeterminateLock && !isReloading && !isConflict;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});
    setIsConflict(false);

    const session = modalSessionRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const payload: RetryRequest = {
      requestId,
      version: currentHeadVersion,
      reason: trimmedReason,
    };

    try {
      let receipt: MutationReceipt;
      if (kind === 'INDEX') {
        receipt = await retryPublication(targetId, payload, controller.signal);
      } else {
        receipt = await retryCleanupJob(targetId, payload, controller.signal);
      }

      if (!isMountedRef.current || modalSessionRef.current !== session) {
        return;
      }
      setIsSubmitting(false);
      onSuccess(receipt);
    } catch (err: unknown) {
      if (!isMountedRef.current || modalSessionRef.current !== session) {
        return;
      }
      setIsSubmitting(false);
      const parsed = parsePublicationError(err, t('Không thể thực hiện thử lại tác vụ.'));
      setGeneralError(parsed.message);
      setFieldErrors(parsed.fieldErrors);

      if (parsed.status === 409) {
        setIsConflict(true);
      } else if (parsed.status === 0 || parsed.status >= 500) {
        onIndeterminateError?.({
          requestId,
          sourceId: head.sourceId,
          targetId,
          operation: kind === 'INDEX' ? 'RETRY_INDEX' : 'RETRY_CLEANUP',
          reason: trimmedReason,
          version: currentHeadVersion,
          occurredAt: new Date().toISOString(),
          errorMessage: parsed.message,
        });
      }
    }
  };

  const handleReloadHead = async () => {
    if (!onReloadHead) return;
    setIsReloading(true);
    setGeneralError(null);
    const session = modalSessionRef.current;

    try {
      const res = await onReloadHead();
      if (!isMountedRef.current || modalSessionRef.current !== session) {
        return;
      }
      if (res && typeof res === 'object' && 'version' in res && typeof (res as PublicationHead).version === 'number') {
        setCurrentHeadVersion((res as PublicationHead).version);
      }
      setIsConflict(false);
      setIsReloading(false);
    } catch {
      if (!isMountedRef.current || modalSessionRef.current !== session) {
        return;
      }
      setIsReloading(false);
      setGeneralError(t('Không thể làm mới phiên bản xuất bản. Vui lòng thử lại.'));
    }
  };

  const modalTitle =
    kind === 'INDEX'
      ? t('Thử lại tác vụ chỉ mục (INDEX)')
      : t('Thử lại tác vụ dọn dẹp vector (CLEANUP)');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">
              refresh
            </span>
            <div>
              <h2 id="retry-modal-title" className="text-lg font-bold text-text">
                {modalTitle}
              </h2>
              <p className="text-xs text-gray font-mono">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors disabled:opacity-50"
            title={t('Đóng')}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              close
            </span>
          </button>
        </div>

        {/* Conflict / General Error Alert */}
        {generalError && (
          <div
            data-testid="retry-error-banner"
            className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-red-600">
                  error
                </span>
                <span>{generalError}</span>
              </div>
              {(isConflict || indeterminateLock || generalError) && onReloadHead && (
                <button
                  type="button"
                  data-testid="retry-reload-head-button"
                  onClick={handleReloadHead}
                  disabled={isReloading}
                  className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                >
                  {isReloading ? t('Đang tải...') : t('Tải lại head')}
                </button>
              )}
            </div>
            {isConflict && (
              <p className="text-[11px] text-red-700 dark:text-red-300">
                {t('Nội dung lý do bạn đã nhập được giữ nguyên. Vui lòng bấm Tải lại head để cập nhật phiên bản mới nhất rồi gửi lại.')}
              </p>
            )}
          </div>
        )}

        {indeterminateLock && (
          <div
            data-testid="indeterminate-alert-banner"
            className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-amber-600">
                  sync_problem
                </span>
                <span>{t('Thao tác trước đó gặp sự cố mạng hoặc thời gian chờ (timeout). Trạng thái máy chủ chưa xác định.')}</span>
              </div>
              <div className="flex items-center gap-2">
                {onVerifyReceipt && (
                  <button
                    type="button"
                    data-testid="verify-receipt-button"
                    onClick={onVerifyReceipt}
                    className="px-3 py-1 rounded-lg bg-teal text-white font-semibold cursor-pointer shrink-0"
                  >
                    {t('Xác minh biên nhận')}
                  </button>
                )}
                {onReloadHead && (
                  <button
                    type="button"
                    data-testid="retry-reload-head-button"
                    onClick={handleReloadHead}
                    disabled={isReloading}
                    className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/40 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isReloading ? t('Đang tải...') : t('Tải lại head')}
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              {t('Mã yêu cầu (RequestId) và nội dung lý do được giữ nguyên. Vui lòng xác minh biên nhận hoặc tải lại head để kiểm tra trước khi thao tác tiếp.')}
            </p>
          </div>
        )}

        {/* Details card */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-bg p-3 rounded-xl border border-border font-mono">
          <div>
            <span className="text-gray block">{t('Head Version')}:</span>
            <span className="font-semibold text-text">v{currentHeadVersion} (gen #{head.generation})</span>
          </div>
          <div>
            <span className="text-gray block">{t('Loại tác vụ')}:</span>
            <span className="font-semibold text-text">{kind}</span>
          </div>
          <div>
            <span className="text-gray block">{t('Mã mục tiêu')}:</span>
            <span className="text-[10px] text-gray truncate block" title={targetId}>
              {targetId}
            </span>
          </div>
          <div>
            <span className="text-gray block">{t('Mã yêu cầu (RequestId)')}:</span>
            <span className="text-[10px] text-gray truncate block" title={requestId}>
              {requestId}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="retry-reason" className="block text-xs font-semibold text-text mb-1.5">
              {t('Lý do thử lại')} <span className="text-coral">*</span>
            </label>
            <textarea
              id="retry-reason"
              data-testid="retry-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting || indeterminateLock}
              placeholder={t('Nhập lý do thực hiện thử lại tác vụ bị thất bại...')}
              maxLength={4000}
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-surface text-text placeholder:text-gray focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all ${
                fieldErrors.reason ? 'border-coral' : 'border-border'
              }`}
            />
            <div className="flex items-center justify-between text-[11px] text-gray mt-1 font-mono">
              {fieldErrors.reason ? (
                <span className="text-coral">{fieldErrors.reason}</span>
              ) : (
                <span>{t('Tối đa 4.000 ký tự')}</span>
              )}
              <span>{reason.length}/4000</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-bg text-text text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              {t('Hủy')}
            </button>
            <button
              type="submit"
              data-testid="retry-submit-button"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('Đang gửi...')}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    refresh
                  </span>
                  <span>{t('Xác nhận thử lại')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
