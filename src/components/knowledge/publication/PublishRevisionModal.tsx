import { useState, useRef, useEffect } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-2xl">
              publish
            </span>
            <div>
              <h2 id="publish-modal-title" className="text-lg font-bold text-text">
                {t('Yêu cầu xuất bản vào RAG')}
              </h2>
              <p className="text-xs text-gray font-mono">
                {sourceTitle} • Rev #{revision.revisionNumber} (v{revision.version})
              </p>
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
                  className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-900 dark:text-red-100 font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
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
                    className="px-3 py-1 rounded-lg bg-teal text-white font-semibold cursor-pointer shrink-0"
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

        {/* Publication summary cards */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-bg p-3 rounded-xl border border-border font-mono">
          <div>
            <span className="text-gray block">{t('Head Version')}:</span>
            <span className="font-semibold text-text">v{currentHeadVersion} (gen #{head.generation})</span>
          </div>
          <div>
            <span className="text-gray block">{t('Tầng thẩm định')}:</span>
            <span className="font-semibold text-text">{assessedTier || '—'} (DURI-1B-v1)</span>
          </div>
          <div>
            <span className="text-gray block">{t('Số đoạn trích (chunks)')}:</span>
            <span className="font-semibold text-text">{revision.chunks.length}</span>
          </div>
          <div>
            <span className="text-gray block">{t('Mã yêu cầu (Idempotency)')}:</span>
            <span className="text-[10px] text-gray truncate block" title={requestId}>
              {requestId}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Input */}
          <div>
            <label htmlFor="publish-reason" className="block text-xs font-semibold text-text mb-1.5">
              {t('Lý do / Căn cứ xuất bản')} <span className="text-coral">*</span>
            </label>
            <textarea
              id="publish-reason"
              data-testid="publish-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting || indeterminateLock}
              placeholder={t('Nhập lý do phê chuẩn xuất bản vào hệ thống trợ lý tri thức chuyên sâu...')}
              maxLength={4000}
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-surface text-text placeholder:text-gray focus:outline-hidden focus:ring-2 focus:ring-teal/30 transition-all ${
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

          {/* Disclosure Confirmation Checkbox */}
          <div className="p-3.5 rounded-xl border border-teal/20 bg-teal/5 dark:bg-teal/10 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-text select-none">
              <input
                type="checkbox"
                data-testid="publish-disclosure-checkbox"
                checked={disclosureConfirmed}
                onChange={(e) => setDisclosureConfirmed(e.target.checked)}
                disabled={isSubmitting || indeterminateLock}
                className="mt-0.5 rounded border-border text-teal focus:ring-teal/30 cursor-pointer"
              />
              <span className="leading-relaxed">
                <span className="font-semibold text-teal dark:text-teal-300">
                  {t('Xác nhận công bố dữ liệu (disclosureConfirmed)')}:
                </span>{' '}
                {t(
                  'Tôi xác nhận các trường tiêu đề (title), nội dung (content), tiêu đề đoạn trích (chunkTitle), vị trí trích dẫn (locator) và đường dẫn nguồn (sourceUrl) được phép đưa vào cơ sở dữ liệu hoạt động của hệ thống RAG phục vụ tư vấn cây sầu riêng.'
                )}
              </span>
            </label>
            <p className="text-[11px] text-gray pl-6 leading-normal">
              {t(
                'Lưu ý: Thông tin tác giả cá nhân, ghi chú thẩm định riêng và tài liệu chứng minh nhạy cảm sẽ được giữ bí mật và không được chuyển vào vector database.'
              )}
            </p>
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
              data-testid="publish-submit-button"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span aria-hidden="true" className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                  <span>{t('Đang gửi yêu cầu...')}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    send
                  </span>
                  <span>{t('Xác nhận xuất bản')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
