import { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { submitDecision, parseGovernanceError } from '../../api/governance';
import type { AssignmentDetail, DecisionRequest, DecisionResponse } from '../../types/governance';
import DecisionOutcomeBadge from './DecisionOutcomeBadge';
import KnowledgeTierBadge from './KnowledgeTierBadge';

interface ExpertDecisionConfirmModalProps {
  assignment: AssignmentDetail;
  decisionData: DecisionRequest;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: DecisionResponse) => void;
  onReload?: () => Promise<AssignmentDetail | unknown> | void;
  mustVerifyReload?: boolean;
  onIndeterminateError?: () => void;
}

type DecisionModalErrorType = 'conflict' | 'forbidden' | 'timeout' | 'validation' | 'generic';

export default function ExpertDecisionConfirmModal({
  assignment,
  decisionData,
  isOpen,
  onClose,
  onSuccess,
  onReload,
  mustVerifyReload = false,
  onIndeterminateError,
}: ExpertDecisionConfirmModalProps) {
  useLanguage();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<DecisionModalErrorType | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const openRevVersionRef = useRef<number | null>(null);
  const openAssignVersionRef = useRef<number | null>(null);

  if (isOpen && openRevVersionRef.current === null) {
    openRevVersionRef.current = assignment.revision.version;
    openAssignVersionRef.current = assignment.version;
  } else if (!isOpen && openRevVersionRef.current !== null) {
    openRevVersionRef.current = null;
    openAssignVersionRef.current = null;
  }

  const capturedRevVersion = openRevVersionRef.current ?? assignment.revision.version;
  const capturedAssignVersion = openAssignVersionRef.current ?? assignment.version;
  const versionMismatch =
    openRevVersionRef.current !== null &&
    (assignment.revision.version !== openRevVersionRef.current || assignment.version !== openAssignVersionRef.current);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setErrorType(null);
      setIsReloading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncVersion = () => {
    openRevVersionRef.current = assignment.revision.version;
    openAssignVersionRef.current = assignment.version;
    setError(null);
    setErrorType(null);
  };

  const handleReloadAndVerify = async () => {
    if (!onReload) return;
    setIsReloading(true);
    try {
      const fresh = await onReload();
      if (fresh && typeof fresh === 'object' && 'version' in fresh && 'revision' in fresh) {
        const freshAssignment = fresh as AssignmentDetail;
        if (
          freshAssignment.status === 'COMPLETED' ||
          Boolean(freshAssignment.decision)
        ) {
          onSuccess(freshAssignment as unknown as DecisionResponse);
          onClose();
          return;
        }
        if (freshAssignment.status !== 'ACTIVE') {
          onClose();
          return;
        }
        openRevVersionRef.current = freshAssignment.revision.version;
        openAssignVersionRef.current = freshAssignment.version;
      } else {
        openRevVersionRef.current = assignment.revision.version;
        openAssignVersionRef.current = assignment.version;
      }
      setError(null);
      setErrorType(null);
    } catch {
      setError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      setIsReloading(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (versionMismatch || isSubmitting || mustVerifyReload) return;

    setIsSubmitting(true);
    setError(null);
    setErrorType(null);

    const payload: DecisionRequest = {
      ...decisionData,
      version: capturedRevVersion,
      assignmentVersion: capturedAssignVersion,
    };

    try {
      const res = await submitDecision(assignment.id, payload);
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      const parsed = parseGovernanceError(err, t('Không thể gửi quyết định thẩm định.'));
      setError(parsed.message);

      const errObj = err as { response?: unknown; code?: string };
      const isConflict =
        parsed.status === 409 ||
        parsed.code?.includes('conflict') ||
        parsed.code?.includes('assignment_changed') ||
        parsed.code?.includes('decision_exists') ||
        parsed.code?.includes('stale_version');
      const isForbidden = parsed.status === 403;
      const isTimeout = !errObj?.response || errObj?.code === 'ECONNABORTED' || parsed.status === 504;

      if (isConflict) {
        setErrorType('conflict');
        onIndeterminateError?.();
      } else if (isForbidden) {
        setErrorType('forbidden');
        onIndeterminateError?.();
      } else if (isTimeout) {
        setErrorType('timeout');
        onIndeterminateError?.();
      } else if (parsed.status === 400) {
        setErrorType('validation');
      } else {
        setErrorType('generic');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2 text-teal">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              verified
            </span>
            <h2 id="decision-confirm-title" className="text-base font-bold text-text">
              {t('Xác nhận quyết định thẩm định')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-decision-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              close
            </span>
          </button>
        </div>

        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1 text-xs">
          {/* Solemn Warning */}
          <div className="p-3.5 rounded-xl bg-amber/10 border border-amber/30 text-amber space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                gavel
              </span>
              <span>{t('Lưu ý trách nhiệm chuyên môn')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-text/90">
              {t('Quyết định thẩm định có tính pháp lý chuyên môn và sẽ được lưu trữ vĩnh viễn trong nhật ký kiểm toán. Bạn KHÔNG THỂ hoàn tác hoặc sửa đổi quyết định sau khi gửi.')}
            </p>
          </div>

          {/* Decision Summary Card */}
          <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-gray">{t('Kết luận thẩm định')}:</span>
              <DecisionOutcomeBadge outcome={decisionData.outcome} />
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-gray">{t('Tầng tri thức được xác nhận')}:</span>
              <KnowledgeTierBadge tier={decisionData.assessedTier} showDesc />
            </div>

            {decisionData.tierRationale && (
              <div className="border-t border-border/60 pt-2 text-[11px]">
                <strong className="text-gray block mb-0.5">{t('Căn cứ xếp tầng')}:</strong>
                <p className="text-text [overflow-wrap:anywhere] italic">"{decisionData.tierRationale}"</p>
              </div>
            )}

            <div className="border-t border-border/60 pt-2 text-[11px]">
              <strong className="text-gray block mb-0.5">{t('Nhận xét chuyên môn / Lý do')}:</strong>
              <p className="text-text [overflow-wrap:anywhere]">{decisionData.reason}</p>
            </div>

            <div className="border-t border-border/60 pt-2 text-[11px] flex items-center justify-between">
              <span className="text-gray">{t('Ý kiến góp ý cho các đoạn trích')}:</span>
              <span className="font-bold text-text">
                {decisionData.chunkComments.length} {t('đoạn trích')}
              </span>
            </div>
          </div>

          {/* Version Mismatch Warning */}
          {versionMismatch && (
            <div
              data-testid="decision-version-mismatch"
              className="p-3.5 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Dữ liệu phiên bản hoặc nhiệm vụ đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện có phiên bản mới hơn. Vui lòng xác nhận cập nhật trước khi gửi quyết định.')}
              </p>
              <button
                type="button"
                onClick={handleSyncVersion}
                className="px-3 py-1.5 rounded-lg bg-amber text-surface dark:text-bg font-semibold cursor-pointer"
              >
                {t('Cập nhật phiên bản mới nhất')}
              </button>
            </div>
          )}

          {(error || mustVerifyReload) && (
            <div
              data-testid="decision-error-banner"
              className="p-3.5 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-2 text-xs"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0">
                  {errorType === 'timeout' ? 'wifi_off' : errorType === 'conflict' ? 'sync_problem' : 'error'}
                </span>
                <span>
                  {errorType === 'timeout'
                    ? t('Quá thời gian chờ / Kết quả chưa xác định')
                    : errorType === 'conflict'
                    ? t('Xung đột dữ liệu (409 Conflict)')
                    : errorType === 'forbidden'
                    ? t('Mất quyền thẩm định (403 Forbidden)')
                    : t('Lỗi ban hành quyết định')}
                </span>
              </div>
              <p className="leading-relaxed">
                {error ||
                  t(
                    'Nhiệm vụ hoặc phiên bản có thay đổi chưa xác định. Vui lòng tải lại và xác nhận trạng thái trước khi tiếp tục.'
                  )}
              </p>
              {mustVerifyReload && onReload && (
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="reload-and-verify-button"
                    onClick={handleReloadAndVerify}
                    disabled={isReloading}
                    className="px-3 py-1.5 rounded-lg bg-coral text-white font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5 hover:opacity-95"
                  >
                    {isReloading && (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span>{isReloading ? t('Đang kiểm tra...') : t('Tải lại và xác nhận trạng thái')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="px-4 py-2 rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg text-xs font-semibold cursor-pointer"
          >
            {t('Xem lại')}
          </button>
          <button
            type="button"
            data-testid="confirm-decision-submit-button"
            onClick={handleConfirmDecision}
            disabled={versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="px-4 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang gửi...') : t('Xác nhận ban hành quyết định')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
