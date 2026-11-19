import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isConflict) {
      setCurrentHeadVersion(head.version);
    }
  }, [head.version, isConflict]);

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (justOpened) {
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

      // Autofocus textarea after mount
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (!isOpen && prevIsOpenRef.current) {
      modalSessionRef.current += 1;
      abortControllerRef.current?.abort();
      setGeneralError(null);
      setFieldErrors({});
      setIsConflict(false);
      setIsSubmitting(false);
      setIsReloading(false);
    }
  }, [isOpen, head.version, preservedRequestId, preservedReason]);

  // Trap focus and handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting) {
          onClose();
        } else {
          e.preventDefault();
        }
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isReloading, onClose]);

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

  const handleVerifyReceiptClick = async () => {
    if (!onVerifyReceipt) return;
    setIsReloading(true);
    setGeneralError(null);
    const session = modalSessionRef.current;
    try {
      await onVerifyReceipt();
    } catch (err: unknown) {
      if (!isMountedRef.current || modalSessionRef.current !== session) return;
      const parsed = parsePublicationError(err, t('Không thể xác minh biên nhận thao tác.'));
      setGeneralError(parsed.message);
    } finally {
      if (isMountedRef.current && modalSessionRef.current === session) {
        setIsReloading(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-modal-title"
      data-testid="retry-publication-modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="bg-surface border border-border rounded-xl max-w-[600px] w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div>
            <h3 id="retry-modal-title" className="text-base sm:text-lg font-semibold text-text">
              {kind === 'INDEX' ? t('Thử lập chỉ mục lại') : t('Thử dọn dữ liệu lại')}
            </h3>
            <p className="text-xs text-gray mt-0.5">
              {title || targetId} · {t('Bản {0}', [head.version])}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-retry-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            title={t('Đóng')}
            aria-label={t('Đóng mẫu thử lại')}
            className="w-11 h-11 min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-gray hover:bg-surface-hover hover:text-text transition-colors cursor-pointer text-2xl font-light leading-none"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {/* Metadata Badges / Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              data-preview-badge="true"
              className="h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-[#fffbeb] text-[#92400e] border border-[#fde68a] inline-flex items-center"
            >
              {t('Chờ hoàn tất')}
            </span>
            <span
              data-preview-badge="true"
              className="h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] inline-flex items-center"
            >
              {kind === 'INDEX' ? t('Tác vụ INDEX đã lỗi') : t('Tác vụ CLEANUP đã lỗi')}
            </span>
          </div>

          {/* Info Notice Box */}
          <div className="p-3.5 bg-[#eff6ff] border border-[#cbdaf2] rounded-lg text-[#1e40af] text-xs leading-relaxed">
            {kind === 'INDEX'
              ? t('Tạo yêu cầu thử lại tác vụ lập chỉ mục. Được tiếp nhận chưa đồng nghĩa với lập chỉ mục hoặc kích hoạt thành công.')
              : t('Tạo yêu cầu thử lại tác vụ dọn dữ liệu vector.')}
          </div>

          {/* Explanatory muted text */}
          <p className="text-xs text-[#64748b] leading-relaxed">
            {t(
              'Chỉ hiện hành động theo dữ liệu thực: publication PENDING và tác vụ INDEX mới nhất đã FAILED. Máy chủ vẫn kiểm tra điều kiện khi gửi.'
            )}
          </p>

          {/* Conflict / General Error Alert */}
          {generalError && (
            <div
              data-testid="retry-error-banner"
              className="p-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-base text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                >
                  error
                </span>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="font-bold text-xs text-red-900 dark:text-red-200 leading-snug">
                    {generalError}
                  </div>
                  {isConflict && (
                    <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                      {t(
                        'Nội dung lý do bạn đã nhập được giữ nguyên. Vui lòng bấm Tải lại head để cập nhật phiên bản mới nhất rồi gửi lại.'
                      )}
                    </p>
                  )}
                  {(isConflict || indeterminateLock || generalError) && onReloadHead && (
                    <div className="pt-1">
                      <button
                        type="button"
                        data-testid="retry-reload-head-button"
                        onClick={handleReloadHead}
                        disabled={isReloading}
                        className="h-8 min-h-[32px] px-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 text-xs font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                      >
                        {isReloading ? t('Đang tải...') : t('Tải lại head')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Indeterminate Lock Alert */}
          {indeterminateLock && (
            <div
              data-testid="indeterminate-alert-banner"
              className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2.5"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                >
                  sync_problem
                </span>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200 leading-snug">
                    {t(
                      'Thao tác trước đó gặp sự cố mạng hoặc thời gian chờ (timeout). Trạng thái máy chủ chưa xác định.'
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    {t(
                      'Mã yêu cầu (RequestId) và nội dung lý do được giữ nguyên. Vui lòng xác minh biên nhận hoặc tải lại head để kiểm tra trước khi thao tác tiếp.'
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onVerifyReceipt && (
                      <button
                        type="button"
                        data-testid="verify-receipt-button"
                        onClick={handleVerifyReceiptClick}
                        disabled={isReloading}
                        className="h-8 min-h-[32px] px-3 rounded-lg bg-[#1f5ca9] hover:bg-[#184986] text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50 transition-colors"
                      >
                        {isReloading ? t('Đang kiểm tra...') : t('Xác minh biên nhận')}
                      </button>
                    )}
                    {onReloadHead && (
                      <button
                        type="button"
                        data-testid="retry-reload-head-button"
                        onClick={handleReloadHead}
                        disabled={isReloading}
                        className="h-8 min-h-[32px] px-3 rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/40 text-amber-900 dark:text-amber-100 text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50 transition-colors"
                      >
                        {isReloading ? t('Đang tải...') : t('Tải lại head')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form id="retry-publication-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="retry-reason"
                className="block text-xs font-semibold text-[#1e293b] mb-1.5"
              >
                {t('Lý do thử lại')} <span className="text-[#b91c1c]">*</span>
              </label>
              <textarea
                ref={textareaRef}
                id="retry-reason"
                data-testid="retry-reason-input"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting || indeterminateLock}
                placeholder={t('Ghi căn cứ để thử lại tác vụ…')}
                maxLength={4000}
                className={`w-full min-h-[110px] rounded-lg border bg-surface dark:bg-bg p-3 text-base md:text-sm text-text placeholder:text-[#64748b] focus:border-[#1f5ca9] focus:outline-none focus:ring-1 focus:ring-[#1f5ca9] transition resize-y ${
                  fieldErrors.reason ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              <div className="flex items-center justify-between text-xs text-[#64748b] mt-1.5 font-mono">
                {fieldErrors.reason ? (
                  <span className="text-red-600 dark:text-red-400">{fieldErrors.reason}</span>
                ) : (
                  <span>{t('Từ 1 đến 4.000 ký tự sau khi bỏ khoảng trắng đầu/cuối')}</span>
                )}
                <span className="tabular-nums">{trimmedReason.length}/4000</span>
              </div>
            </div>
          </form>

          {/* Technical disclosure */}
          <details className="group border-t border-[#e2e8f0] pt-2 mt-4 text-xs">
            <summary className="min-h-[44px] flex items-center justify-between cursor-pointer select-none text-[#64748b] font-medium hover:text-[#1e293b]">
              <span>{t('Chi tiết kỹ thuật')}</span>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-sm transition-transform group-open:rotate-180"
              >
                expand_more
              </span>
            </summary>
            <div className="py-2 grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-2 text-xs font-mono">
              <div className="text-[#64748b]">{t('Đích {0}', [kind])}</div>
              <div className="text-[#1e293b] break-all">{targetId}</div>
              <div className="text-[#64748b]">{t('Phiên bản điều phối')}</div>
              <div className="text-[#1e293b]">v{currentHeadVersion} (gen #{head.generation})</div>
              <div className="text-[#64748b]">{t('Mã yêu cầu')}</div>
              <div data-testid="modal-request-id" className="text-[#1e293b] break-all">{requestId}</div>
            </div>
          </details>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-surface-hover/30 border-t border-border flex items-center justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 min-h-[44px] px-5 rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b] text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            {t('Hủy')}
          </button>
          <button
            type="submit"
            form="retry-publication-form"
            data-testid="retry-submit-button"
            disabled={!canSubmit}
            className="h-11 min-h-[44px] px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-sm font-medium shadow-xs disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang gửi...') : t('Gửi yêu cầu thử lại')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
