import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import { revokePublication, parsePublicationError } from '../../../api/publication';
import type {
  PublicationHead,
  RevokeRequest,
  MutationReceipt,
  PublicationSummary,
  IndeterminateOperation,
} from '../../../types/publication';

interface RevokePublicationModalProps {
  publication: PublicationSummary;
  head: PublicationHead;
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

export default function RevokePublicationModal({
  publication,
  head,
  isOpen,
  onClose,
  onSuccess,
  onReloadHead,
  indeterminateLock = false,
  onIndeterminateError,
  onVerifyReceipt,
  preservedRequestId,
  preservedReason,
}: RevokePublicationModalProps) {
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

    const payload: RevokeRequest = {
      requestId,
      version: currentHeadVersion,
      reason: trimmedReason,
    };

    try {
      const receipt = await revokePublication(publication.id, payload, controller.signal);
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
      const parsed = parsePublicationError(err, t('Không thể thu hồi bản xuất bản.'));
      setGeneralError(parsed.message);
      setFieldErrors(parsed.fieldErrors);

      if (parsed.status === 409) {
        setIsConflict(true);
      } else if (parsed.status === 0 || parsed.status >= 500) {
        onIndeterminateError?.({
          requestId,
          sourceId: publication.sourceId,
          targetId: publication.id,
          operation: 'REVOKE',
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-modal-title"
      data-testid="revoke-publication-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-xl max-w-[660px] w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl"
            >
              published_with_changes
            </span>
            <h2 id="revoke-modal-title" className="text-base sm:text-lg font-semibold text-text">
              {t('Thu hồi tri thức khỏi hệ thống RAG')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-revoke-modal-button"
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
          {/* Metadata Strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center">
              {t('Bản {0} · {1}', [publication.revisionNumber ?? 1, publication.status])}
            </span>
            <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center">
              {t('Tầng {0}', [publication.assessedTier ?? 'A'])}
            </span>
            <span className="h-6 px-2.5 rounded-[6px] text-xs font-mono font-medium leading-none bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border inline-flex items-center">
              ID: {publication.id}
            </span>
          </div>

          {/* Notice Box */}
          <div className="p-4 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-lg flex items-start gap-3">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5 shrink-0"
            >
              info
            </span>
            <p className="text-xs text-text leading-relaxed">
              {t(
                'Bản xuất bản được thu hồi theo kết quả máy chủ. Tri thức này sẽ ngừng cung cấp cho các truy vấn của Trợ lý AI. Dọn dẹp dữ liệu chỉ mục (de-indexing) được xử lý riêng bất đồng bộ.'
              )}
            </p>
          </div>

          {/* Conflict / General Error Alert */}
          {generalError && (
            <div
              data-testid="revoke-error-banner"
              className="p-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-base text-red-600 dark:text-red-400"
                  >
                    error
                  </span>
                  <span>{generalError}</span>
                </div>
                {(isConflict || indeterminateLock || generalError) && onReloadHead && (
                  <button
                    type="button"
                    data-testid="revoke-reload-head-button"
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
                  {t(
                    'Nội dung lý do bạn đã nhập được giữ nguyên. Vui lòng bấm Tải lại head để cập nhật phiên bản mới nhất rồi gửi lại.'
                  )}
                </p>
              )}
            </div>
          )}

          {indeterminateLock && (
            <div
              data-testid="indeterminate-alert-banner"
              className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-base text-amber-600 dark:text-amber-400"
                  >
                    sync_problem
                  </span>
                  <span>
                    {t(
                      'Thao tác trước đó gặp sự cố mạng hoặc thời gian chờ (timeout). Trạng thái máy chủ chưa xác định.'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onVerifyReceipt && (
                    <button
                      type="button"
                      data-testid="verify-receipt-button"
                      onClick={onVerifyReceipt}
                      className="px-3 py-1 rounded-lg bg-[#1f5ca9] text-white font-semibold cursor-pointer shrink-0"
                    >
                      {t('Xác minh biên nhận')}
                    </button>
                  )}
                  {onReloadHead && (
                    <button
                      type="button"
                      data-testid="revoke-reload-head-button"
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
                {t(
                  'Mã yêu cầu (RequestId) và nội dung lý do được giữ nguyên. Vui lòng xác minh biên nhận hoặc tải lại head để kiểm tra trước khi thao tác tiếp.'
                )}
              </p>
            </div>
          )}

          {/* Form */}
          <form id="revoke-publication-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="revoke-reason"
                className="block text-xs font-semibold text-text mb-1.5"
              >
                {t('Lý do thu hồi tri thức')} <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea
                id="revoke-reason"
                data-testid="revoke-reason-input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting || indeterminateLock}
                placeholder={t(
                  'Nhập lý do thu hồi (vd: Dữ liệu khuyến cáo dinh dưỡng cũ đã lỗi thời...)'
                )}
                maxLength={4000}
                className={`w-full rounded-lg border bg-surface dark:bg-bg p-3 text-xs text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition ${
                  fieldErrors.reason ? 'border-red-500' : 'border-border'
                }`}
              />
              <div className="flex items-center justify-between text-xs text-gray mt-1.5 font-mono">
                {fieldErrors.reason ? (
                  <span className="text-red-600 dark:text-red-400">{fieldErrors.reason}</span>
                ) : (
                  <span>{t('(Tối thiểu 1 - 4000 ký tự)')}</span>
                )}
                <span className="tabular-nums">{trimmedReason.length} / 4000 {t('ký tự')}</span>
              </div>
            </div>
          </form>

          {/* Technical disclosure */}
          <details className="group border border-border rounded-lg text-xs">
            <summary className="px-3 py-2 cursor-pointer bg-surface font-medium text-gray flex items-center justify-between select-none">
              <span>{t('Chi tiết kỹ thuật & Head Version tham chiếu')}</span>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-sm transition-transform group-open:rotate-180"
              >
                expand_more
              </span>
            </summary>
            <div className="p-3 border-t border-border font-mono bg-slate-50 dark:bg-bg text-gray space-y-1">
              <div>targetPublicationId: {publication.id}</div>
              <div>
                headVersionIndex: {currentHeadVersion} (gen #{head.generation}) · triggerJobKind: CLEANUP
              </div>
              <div>requestId: {requestId}</div>
            </div>
          </details>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-surface-hover/30 border-t border-border flex items-center justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface-hover transition-colors shadow-xs"
          >
            {t('Hủy')}
          </button>
          <button
            type="submit"
            form="revoke-publication-form"
            data-testid="revoke-submit-button"
            disabled={!canSubmit}
            className="h-11 px-6 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-medium shadow-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang xử lý...') : t('Thu hồi tri thức')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
