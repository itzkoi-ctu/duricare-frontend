import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import { publishRevision, parsePublicationError } from '../../../api/publication';
import type {
  PublicationHead,
  PublishRequest,
  MutationReceipt,
  IndeterminateOperation,
} from '../../../types/publication';
import type { RevisionResponse, DecisionDetail } from '../../../types/governance';

interface PublishRevisionModalProps {
  sourceId: string;
  sourceTitle: string;
  sourceLatestRevisionId?: string | null;
  revision: RevisionResponse;
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

export default function PublishRevisionModal({
  sourceId,
  sourceTitle,
  sourceLatestRevisionId,
  revision,
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
}: PublishRevisionModalProps) {
  useLanguage();

  const [reason, setReason] = useState<string>(preservedReason || '');
  const [disclosureConfirmed, setDisclosureConfirmed] = useState<boolean>(false);
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

  // Keep head version in sync when head prop changes and not currently in conflict state
  useEffect(() => {
    if (!isConflict) {
      setCurrentHeadVersion(head.version);
    }
  }, [head.version, isConflict]);

  // Handle open / close lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      modalSessionRef.current += 1;
      // Preserve requestId and reason if already provided; otherwise generate new
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

  const decision = revision.decision as DecisionDetail | null | undefined;
  const assessedTier = decision?.assessedTier;
  const isEligibleTier = assessedTier && ['A', 'B', 'C', 'D', 'E'].includes(assessedTier);

  const preflightIssues: string[] = [];
  if (revision.status !== 'APPROVED') {
    preflightIssues.push(t('Chỉ phiên bản đã được phê duyệt (APPROVED) mới có thể xuất bản vào RAG.'));
  }
  if (!decision || !isEligibleTier) {
    preflightIssues.push(t('Phiên bản phải có quyết định thẩm định hợp lệ với tầng tin cậy A–E (không chấp nhận UNKNOWN).'));
  }
  if (!revision.chunks || revision.chunks.length === 0) {
    preflightIssues.push(t('Phiên bản chưa có đoạn trích (chunks). Không thể xuất bản bản ghi rỗng.'));
  }
  if (sourceLatestRevisionId && sourceLatestRevisionId !== revision.id) {
    preflightIssues.push(t('Chỉ phiên bản mới nhất của nguồn tri thức mới có thể xuất bản.'));
  }
  if (head.pendingPublicationId) {
    preflightIssues.push(t('Nguồn tri thức này đang có một bản xuất bản chờ xử lý (PENDING). Vui lòng đợi hoàn tất hoặc thu hồi trước khi xuất bản tiếp.'));
  }

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 1 && trimmedReason.length <= 4000;
  const canSubmit =
    preflightIssues.length === 0 &&
    isReasonValid &&
    disclosureConfirmed &&
    !isSubmitting &&
    !indeterminateLock &&
    !isReloading &&
    !isConflict;

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

    const payload: PublishRequest = {
      requestId,
      version: currentHeadVersion,
      revisionId: revision.id,
      revisionVersion: revision.version,
      reason: trimmedReason,
      disclosureConfirmed: true,
    };

    try {
      const receipt = await publishRevision(sourceId, payload, controller.signal);
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
      const parsed = parsePublicationError(err, t('Không thể thực hiện xuất bản tri thức.'));
      setGeneralError(parsed.message);
      setFieldErrors(parsed.fieldErrors);

      if (parsed.status === 409) {
        setIsConflict(true);
      } else if (parsed.status === 0 || parsed.status >= 500) {
        onIndeterminateError?.({
          requestId,
          sourceId,
          targetId: revision.id,
          operation: 'PUBLISH',
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] transition-opacity overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      data-testid="publish-revision-modal"
    >
      <div className="w-[640px] max-w-full max-h-[min(90vh,calc(100vh-2rem))] flex flex-col bg-surface border border-border rounded-xl shadow-xl overflow-hidden text-text transition-all my-auto">
        {/* Dialog Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <h2 id="publish-modal-title" className="font-semibold text-[20px] leading-7 text-text tracking-tight">
            {t('Xuất bản tri thức vào RAG')}
          </h2>
          <button
            type="button"
            data-testid="close-publish-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('Đóng cửa sổ')}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-gray hover:bg-surface-hover hover:text-text transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
              close
            </span>
          </button>
        </div>

        {/* Dialog Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 max-h-[calc(90vh-140px)] flex-1 text-sm text-text">
          {/* Source Metadata Summary Block */}
          <section className="bg-slate-50/70 dark:bg-bg border border-border rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray">
                {t('Tài liệu nguồn')}
              </span>
              <span className="text-gray text-xs font-medium tabular-nums font-mono">
                {t('{0} đoạn trích', [revision.chunks ? revision.chunks.length : 0])}
              </span>
            </div>
            <div className="text-base font-semibold text-text leading-snug">
              {sourceTitle}
            </div>
            {/* Badges row: height 24px, rounded 6px, text-xs font-semibold */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border inline-flex items-center">
                {t('Bản {0}', [revision.revisionNumber])}
              </span>
              <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center">
                {t('Đã phê duyệt')}
              </span>
              {assessedTier && (
                <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center">
                  {t('Tầng {0}', [assessedTier])}
                </span>
              )}
            </div>
          </section>

          {/* Preflight warnings if any */}
          {preflightIssues.length > 0 && (
            <div
              data-testid="publish-preflight-alert"
              className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Chưa đủ điều kiện xuất bản')}</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {preflightIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Conflict / General Error Alert */}
          {generalError && (
            <div
              data-testid="publish-error-banner"
              className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <span aria-hidden="true" className="material-symbols-outlined text-base text-red-600 dark:text-red-400">
                    error
                  </span>
                  <span>{generalError}</span>
                </div>
                {isConflict && onReloadHead && (
                  <button
                    type="button"
                    data-testid="publish-reload-head-button"
                    onClick={handleReloadHead}
                    disabled={isReloading}
                    className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-900 dark:text-red-100 font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50 text-xs"
                  >
                    {isReloading ? t('Đang tải...') : t('Tải lại head')}
                  </button>
                )}
              </div>
              {isConflict && (
                <p className="text-[11px] text-red-700 dark:text-red-300">
                  {t('Nội dung lý do bạn đã nhập được giữ nguyên. Vui lòng bấm Tải lại head để cập nhật số hiệu phiên bản mới nhất rồi gửi lại.')}
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
                      className="px-3 py-1 rounded-lg bg-[#1f5ca9] text-white font-semibold cursor-pointer shrink-0 text-xs"
                    >
                      {t('Xác minh biên nhận')}
                    </button>
                  )}
                  {onReloadHead && (
                    <button
                      type="button"
                      data-testid="publish-reload-head-button"
                      onClick={handleReloadHead}
                      disabled={isReloading}
                      className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/40 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer shrink-0 disabled:opacity-50 text-xs"
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

          {/* Form */}
          <form id="publish-revision-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Reason Input */}
            <div className="space-y-1.5">
              <label htmlFor="publish-reason" className="block text-[13px] font-semibold text-text">
                {t('Lý do xuất bản')} <span className="text-red-600">*</span>
              </label>
              <textarea
                id="publish-reason"
                data-testid="publish-reason-input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting || indeterminateLock}
                placeholder={t('Nêu căn cứ xuất bản bản tri thức này')}
                maxLength={4000}
                className={`w-full rounded-lg border p-3 text-sm text-text bg-surface placeholder:text-gray focus:border-[#1f5ca9] focus:ring-2 focus:ring-[#00afef]/25 focus:outline-none transition resize-none ${
                  fieldErrors.reason ? 'border-red-500' : 'border-border'
                }`}
              />
              <div className="flex justify-between items-center text-xs text-gray pt-0.5 font-mono">
                {fieldErrors.reason ? (
                  <span className="text-red-600 font-medium">{fieldErrors.reason}</span>
                ) : (
                  <span>{t('Tối đa 4.000 ký tự')}</span>
                )}
                <span className="tabular-nums">{reason.length} / 4000</span>
              </div>
            </div>

            {/* Consent Panel */}
            <div className="border border-blue-200 dark:border-blue-900 bg-[#eff4ff] dark:bg-blue-950/30 rounded-xl p-4 space-y-2.5">
              <div className="text-[13px] font-semibold text-[#1f5ca9] dark:text-blue-300">
                {t('Xác nhận phạm vi dữ liệu')}
              </div>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="publish-disclosure-checkbox"
                  checked={disclosureConfirmed}
                  onChange={(e) => setDisclosureConfirmed(e.target.checked)}
                  disabled={isSubmitting || indeterminateLock}
                  className="mt-1 w-4 h-4 rounded border-[#94a3b8] text-[#1f5ca9] focus:ring-[#00afef] focus:ring-offset-0 transition cursor-pointer"
                />
                <span className="text-sm text-text leading-relaxed">
                  {t(
                    'Tôi xác nhận tiêu đề tài liệu, nội dung, tiêu đề đoạn trích, vị trí trích dẫn và đường dẫn nguồn được phép đưa vào hệ thống RAG phục vụ tư vấn cây sầu riêng.'
                  )}
                </span>
              </label>
              <p className="text-sm text-gray leading-relaxed pt-1 border-t border-blue-100 dark:border-blue-900/60">
                {t(
                  'Thông tin tác giả cá nhân, ghi chú thẩm định riêng và tài liệu chứng minh nhạy cảm không được chuyển vào cơ sở dữ liệu vector.'
                )}
              </p>
            </div>

            {/* Workflow Notice Line */}
            <div className="text-xs text-gray flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-gray shrink-0">
                info
              </span>
              <span>{t('Yêu cầu sẽ được xử lý trước khi tri thức có thể được sử dụng.')}</span>
            </div>

            {/* Collapsible Disclosure: Chi tiết kỹ thuật */}
            <details className="group border-t border-border pt-2">
              <summary className="text-xs font-medium text-gray flex items-center justify-between cursor-pointer py-1.5 hover:text-text list-none select-none">
                <span className="flex items-center gap-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray group-open:rotate-90 transition-transform duration-150">
                    chevron_right
                  </span>
                  <span>{t('Chi tiết kỹ thuật')}</span>
                </span>
                <span className="text-[11px] text-gray font-mono">DURI-1B-v1</span>
              </summary>
              <div className="mt-2 pl-5 pr-3 py-2 bg-slate-50 dark:bg-bg rounded-lg border border-border text-[11px] font-mono text-gray space-y-1">
                <div>
                  Head version: <span className="text-text font-semibold">v{currentHeadVersion}</span> · Generation: <span className="text-text font-semibold">{head.generation}</span> · Policy: <span className="text-text font-semibold">DURI-1B-v1</span>
                </div>
                <div>
                  Request ID: <span className="text-[#1f5ca9] font-medium break-all">{requestId}</span>
                </div>
              </div>
            </details>
          </form>
        </div>

        {/* Dialog Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-slate-50/60 dark:bg-surface-hover/30 flex items-center justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface-hover transition shadow-xs"
          >
            {t('Hủy')}
          </button>
          <button
            type="submit"
            form="publish-revision-form"
            data-testid="confirm-publish-button"
            disabled={!canSubmit}
            className="h-11 px-6 rounded-lg text-sm font-medium bg-[#1f5ca9] hover:bg-[#184988] text-white transition shadow-xs disabled:bg-[#1f5ca9]/40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('Đang gửi yêu cầu...')}</span>
              </>
            ) : (
              <span>{t('Xác nhận xuất bản')}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
