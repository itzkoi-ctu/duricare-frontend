import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { submitDecision, parseGovernanceError } from '../../api/governance';
import type { AssignmentDetail, DecisionRequest, DecisionResponse } from '../../types/governance';
import { TIER_CONFIG } from '../../utils/governanceStatus';
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

  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef<boolean>(false);

  const isSubmittingRef = useRef<boolean>(isSubmitting);
  isSubmittingRef.current = isSubmitting;
  const isReloadingRef = useRef<boolean>(isReloading);
  isReloadingRef.current = isReloading;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const openRevVersionRef = useRef<number | null>(null);
  const openAssignVersionRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

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

  // Focus trap, Escape key, backdrop lock, and return focus lifecycle (R2)
  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      setError(null);
      setErrorType(null);
      setIsReloading(false);
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        triggerRef.current?.focus();
        triggerRef.current = null;
      }
      return;
    }

    // Capture trigger once per open session
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      triggerRef.current = document.activeElement as HTMLElement | null;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      if (closeBtnRef.current && !closeBtnRef.current.disabled) {
        closeBtnRef.current.focus();
      } else if (dialogPanelRef.current) {
        dialogPanelRef.current.focus();
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmittingRef.current && !isReloadingRef.current) {
          e.preventDefault();
          onCloseRef.current();
        } else {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        // When in-flight operations disable all action buttons, trap focus on the dialog panel fallback
        if (focusableElements.length === 0) {
          e.preventDefault();
          if (dialogPanelRef.current && !dialogRef.current.contains(document.activeElement)) {
            dialogPanelRef.current.focus();
          }
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
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
      document.body.style.overflow = originalOverflow;
      // Only return focus on unmount if modal was open and is now unmounting
      if (wasOpenRef.current && !isMountedRef.current) {
        triggerRef.current?.focus();
        triggerRef.current = null;
        wasOpenRef.current = false;
      }
    };
  }, [isOpen]);

  // Keep focus inside dialog panel if activeElement escapes while actions are in-flight/disabled
  useEffect(() => {
    if (!isOpen) return;

    const ensureFocusInside = () => {
      if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
        dialogPanelRef.current?.focus();
      }
    };

    if (isSubmitting || isReloading) {
      ensureFocusInside();
    }

    const handleFocusOut = () => {
      setTimeout(() => {
        if (isMountedRef.current && (isSubmittingRef.current || isReloadingRef.current)) {
          ensureFocusInside();
        }
      }, 0);
    };

    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isOpen, isSubmitting, isReloading]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmittingRef.current && !isReloadingRef.current) {
      onCloseRef.current();
    }
  };

  const handleSyncVersion = () => {
    openRevVersionRef.current = assignment.revision.version;
    openAssignVersionRef.current = assignment.version;
    setError(null);
    setErrorType(null);
  };

  const handleReloadAndVerify = async () => {
    if (!onReload) return;
    const targetAssignmentId = assignment.id;
    const targetRevId = assignment.revision.id;
    dialogPanelRef.current?.focus();
    setIsReloading(true);
    try {
      const fresh = await onReload();
      if (!isMountedRef.current || !isOpen || assignment.id !== targetAssignmentId || assignment.revision.id !== targetRevId) return;
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
      if (!isMountedRef.current || !isOpen || assignment.id !== targetAssignmentId || assignment.revision.id !== targetRevId) return;
      setError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      if (isMountedRef.current) {
        setIsReloading(false);
      }
    }
  };

  const handleConfirmDecision = async () => {
    if (versionMismatch || isSubmitting || mustVerifyReload) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const targetAssignmentId = assignment.id;
    const targetRevId = assignment.revision.id;

    dialogPanelRef.current?.focus();
    setIsSubmitting(true);
    setError(null);
    setErrorType(null);

    const payload: DecisionRequest = {
      ...decisionData,
      version: capturedRevVersion,
      assignmentVersion: capturedAssignVersion,
    };

    try {
      const res = await submitDecision(assignment.id, payload, controller.signal);
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || assignment.id !== targetAssignmentId || assignment.revision.id !== targetRevId) {
        return;
      }
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || assignment.id !== targetAssignmentId || assignment.revision.id !== targetRevId) {
        return;
      }
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

  const assessedTierConfig = TIER_CONFIG[decisionData.assessedTier];

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-confirm-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        ref={dialogPanelRef}
        tabIndex={-1}
        data-testid="expert-decision-confirm-dialog-panel"
        className="bg-surface border border-border rounded-xl max-w-[600px] w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-[14px] leading-[22px] text-text outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2 text-[#1f5ca9] dark:text-[#60a5fa]">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl" data-icon="task_alt">
              task_alt
            </span>
            <h2 id="decision-confirm-title" className="text-base font-bold text-text">
              {t('Xác nhận quyết định')}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            data-testid="close-decision-modal-button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            aria-label={t('Đóng')}
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1 text-[14px] leading-[22px]">
          {/* Document Title & Revision Badge */}
          <div className="pb-2 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[14px] leading-[22px] font-semibold text-text truncate">
                {assignment.revision.metadata.title}
              </span>
              <span className="h-6 px-2 flex items-center text-[11px] font-semibold rounded-[6px] bg-bg border border-border text-gray shrink-0">
                {t('Bản {0}', [assignment.revision.revisionNumber])}
              </span>
            </div>
          </div>

          {/* Decision Summary Card */}
          <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray text-[14px] leading-[22px]">{t('Kết luận thẩm định')}:</span>
              <DecisionOutcomeBadge outcome={decisionData.outcome} shape="r6" />
            </div>

            {/* Tier Row - wrapped in own block to prevent horizontal overflow */}
            <div className="border-t border-border/60 pt-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray text-[14px] leading-[22px]">{t('Tầng tri thức xác nhận')}:</span>
                <KnowledgeTierBadge tier={decisionData.assessedTier} />
              </div>
              {assessedTierConfig && decisionData.assessedTier !== 'UNKNOWN' && (
                <p className="text-[12px] leading-relaxed text-gray break-words">
                  {t(assessedTierConfig.desc)}
                </p>
              )}
            </div>

            {decisionData.tierRationale && (
              <div className="border-t border-border/60 pt-2.5 space-y-1">
                <strong className="text-gray block text-xs font-semibold">{t('Căn cứ xếp tầng')}:</strong>
                <p className="text-text text-[13px] leading-[20px] [overflow-wrap:anywhere] italic">"{decisionData.tierRationale}"</p>
              </div>
            )}

            <div className="border-t border-border/60 pt-2.5 space-y-1">
              <strong className="text-gray block text-xs font-semibold">{t('Lý do & Ý kiến thẩm định')}:</strong>
              <p className="text-text text-[13px] leading-[20px] [overflow-wrap:anywhere]">{decisionData.reason}</p>
            </div>

            {decisionData.chunkComments.length > 0 && (
              <div className="border-t border-border/60 pt-2.5 flex items-center justify-between text-xs">
                <span className="text-gray">{t('Ý kiến góp ý cho các đoạn trích')}:</span>
                <span className="font-semibold text-text">
                  {decisionData.chunkComments.length} {t('đoạn trích')}
                </span>
              </div>
            )}
          </div>

          {/* Approved neutral information notice */}
          <div className="p-3 bg-surface-hover/60 border border-border rounded-lg flex items-start gap-2 text-xs text-gray">
            <span aria-hidden="true" className="material-symbols-outlined text-[#1f5ca9] dark:text-[#60a5fa] text-[18px] shrink-0 mt-0.5">
              info
            </span>
            <p className="text-[12px] leading-relaxed text-gray">
              {t('Quyết định lưu lịch sử và không sửa trực tiếp sau khi gửi.')}
            </p>
          </div>

          {/* Version Mismatch Warning */}
          {versionMismatch && (
            <div
              data-testid="decision-version-mismatch"
              className="p-3.5 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-2 text-xs"
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
                className="h-11 min-h-[44px] px-4 rounded-lg bg-amber text-surface dark:text-bg font-semibold cursor-pointer flex items-center justify-center"
              >
                {t('Cập nhật phiên bản mới nhất')}
              </button>
            </div>
          )}

          {/* Conflict / Indeterminate Error Banner */}
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
                    className="h-11 min-h-[44px] px-4 rounded-lg bg-coral text-white font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 hover:opacity-95"
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

        {/* Modal Footer: Strict vertical stack on mobile, horizontal on desktop */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-bg text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center"
          >
            {t('Xem lại')}
          </button>
          <button
            type="button"
            data-testid="confirm-decision-submit-button"
            onClick={handleConfirmDecision}
            disabled={versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            ) : (
              <span aria-hidden="true" className="material-symbols-outlined text-base" data-icon="send">
                send
              </span>
            )}
            <span>{isSubmitting ? t('Đang gửi...') : t('Gửi quyết định')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
