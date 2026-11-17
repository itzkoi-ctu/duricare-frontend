import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { listReviewerCandidates, reassignReviewer, parseGovernanceError } from '../../api/governance';
import type { RevisionSummary, RevisionResponse, ReviewerCandidate, AssignmentSummary, AssignmentDetail } from '../../types/governance';

interface AdminReassignReviewerModalProps {
  revision: RevisionSummary | RevisionResponse;
  activeAssignment: AssignmentSummary;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assignment: AssignmentDetail) => void;
  onReload?: () => Promise<RevisionSummary | RevisionResponse | unknown> | void;
  mustVerifyReload?: boolean;
  onIndeterminateError?: () => void;
}

export default function AdminReassignReviewerModal({
  revision,
  activeAssignment,
  isOpen,
  onClose,
  onSuccess,
  onReload,
  mustVerifyReload = false,
  onIndeterminateError,
}: AdminReassignReviewerModalProps) {
  useLanguage();

  const [candidates, setCandidates] = useState<ReviewerCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<ReviewerCandidate | null>(null);
  const [reason, setReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    if (isOpen) {
      setSelectedCandidate(null);
      setReason('');
      setSearchQuery('');
      setSubmitError(null);
      setIsReloading(false);
      setLoadingCandidates(true);
      setCandidateError(null);

      listReviewerCandidates(revision.id, 0, 50)
        .then(res => {
          // Exclude currently assigned reviewer
          setCandidates(res.content.filter(c => c.userId !== activeAssignment.reviewerUserId));
          setLoadingCandidates(false);
        })
        .catch(err => {
          const parsed = parseGovernanceError(err, t('Không thể tải danh sách ứng viên thẩm định.'));
          setCandidateError(parsed.message);
          setLoadingCandidates(false);
        });
    } else {
      abortControllerRef.current?.abort();
    }
  }, [isOpen, revision.id, activeAssignment.reviewerUserId]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isFormValid = selectedCandidate !== null && trimmedReason.length >= 3 && trimmedReason.length <= 4000;

  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.affiliation && c.affiliation.toLowerCase().includes(q)) ||
      (c.specialties && c.specialties.toLowerCase().includes(q))
    );
  });

  const handleSyncVersion = () => {
    openVersionRef.current = revision.version;
    setSubmitError(null);
  };

  const handleReloadAndVerify = async () => {
    if (!onReload) return;
    const targetRevisionId = revision.id;
    const targetAssignmentId = activeAssignment.id;
    setIsReloading(true);
    try {
      const fresh = await onReload();
      if (!isMountedRef.current || !isOpen || revision.id !== targetRevisionId || activeAssignment.id !== targetAssignmentId) return;
      if (fresh && typeof fresh === 'object' && 'stale' in fresh) {
        return;
      }
      if (fresh && typeof fresh === 'object' && 'committed' in fresh) {
        onClose();
        return;
      }
      if (!fresh || (typeof fresh === 'object' && 'status' in fresh && (fresh as { status?: string }).status !== 'IN_REVIEW')) {
        onClose();
        return;
      }
      const freshVersion =
        fresh && typeof fresh === 'object' && 'version' in fresh && typeof (fresh as { version?: unknown }).version === 'number'
          ? (fresh as { version: number }).version
          : revision.version;
      openVersionRef.current = freshVersion;
      setSubmitError(null);
    } catch {
      if (!isMountedRef.current || !isOpen || revision.id !== targetRevisionId || activeAssignment.id !== targetAssignmentId) return;
      setSubmitError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      if (isMountedRef.current) {
        setIsReloading(false);
      }
    }
  };

  const handleReassign = async () => {
    if (!isFormValid || !selectedCandidate || versionMismatch || isSubmitting || mustVerifyReload) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const targetRevisionId = revision.id;
    const targetAssignmentId = activeAssignment.id;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const assignment = await reassignReviewer(
        revision.id,
        {
          version: capturedVersion,
          activeAssignmentId: activeAssignment.id,
          reviewerUserId: selectedCandidate.userId,
          reason: trimmedReason,
        },
        controller.signal
      );
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || revision.id !== targetRevisionId || activeAssignment.id !== targetAssignmentId) {
        return;
      }
      onSuccess(assignment);
      onClose();
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || revision.id !== targetRevisionId || activeAssignment.id !== targetAssignmentId) {
        return;
      }
      const parsed = parseGovernanceError(err, t('Không thể đổi người thẩm định.'));
      setSubmitError(parsed.message);

      const errObj = err as { response?: unknown; code?: string };
      const isConflict =
        parsed.status === 409 ||
        parsed.code?.includes('conflict') ||
        parsed.code?.includes('assignment_changed') ||
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
      aria-labelledby="reassign-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-[600px] bg-surface rounded-xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-text">
        {/* Modal Header */}
        <div className="h-16 px-5 sm:px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2 text-[#1f5ca9] dark:text-[#60a5fa]">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
              published_with_changes
            </span>
            <h2 id="reassign-modal-title" className="text-base sm:text-lg font-bold text-text">
              {t('Đổi chuyên gia thẩm định')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-reassign-modal-button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="w-11 h-11 -mr-2 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover cursor-pointer transition-colors"
            title={t('Đóng')}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-surface flex-1 text-sm">
          {/* Target Revision Summary Card */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-surface-hover border border-border space-y-2">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              {t('Hồ sơ thẩm định')}
            </div>
            <div className="text-sm sm:text-[15px] font-semibold text-text leading-snug break-words">
              {revision.title}
            </div>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="inline-flex items-center justify-center h-6 px-2.5 text-xs font-medium rounded-[6px] bg-surface border border-border text-text whitespace-nowrap">
                {t('Bản {0}', [revision.revisionNumber])}
              </span>
              <span className="inline-flex items-center justify-center h-6 px-2.5 text-xs font-medium rounded-[6px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">
                {t('Đang thẩm định')}
              </span>
            </div>
          </div>

          {/* Current Reviewer Notice Banner */}
          <div
            data-testid="current-reviewer-notice-banner"
            className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1 text-xs text-amber-900 dark:text-amber-200"
          >
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                info
              </span>
              <span>
                {t('Người thẩm định hiện tại')}: {activeAssignment.reviewerDisplayName} (#{activeAssignment.reviewerUserId})
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-text/80">
              {t(
                'Khi đổi người, phân công cũ sẽ chuyển thành ĐÃ THAY THẾ (REPLACED) và chuyên gia cũ sẽ mất quyền truy cập vào hồ sơ này.'
              )}
            </p>
          </div>

          {/* Version Mismatch Warning */}
          {versionMismatch && (
            <div
              data-testid="reassign-version-mismatch"
              className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-2 text-xs"
            >
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  warning
                </span>
                <span>{t('Phiên bản hồ sơ đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện có phiên bản v{0} (khác v{1}). Vui lòng cập nhật phiên bản trước khi đổi người.', [
                  revision.version,
                  capturedVersion,
                ])}
              </p>
              <button
                type="button"
                onClick={handleSyncVersion}
                className="h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-xs transition-colors"
              >
                {t('Cập nhật lên v{0}', [revision.version])}
              </button>
            </div>
          )}

          {/* Candidate Selection Section */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-text">
              {t('Chọn chuyên gia thay thế')} <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <span
                aria-hidden="true"
                className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px] pointer-events-none"
              >
                search
              </span>
              <input
                type="text"
                data-testid="reassign-candidate-search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Tìm kiếm chuyên gia thay thế (trong 50 hồ sơ)...')}
                className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm rounded-lg border border-border bg-surface text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-[#1f5ca9] focus:border-[#1f5ca9]"
              />
            </div>
            <div className="text-[11px] text-text-muted">
              {t('Chỉ tìm kiếm trong 50 chuyên gia đã tải vào phiên làm việc (loại trừ người hiện tại)')}
            </div>

            {loadingCandidates ? (
              <div className="py-8 text-center text-text-muted flex items-center justify-center gap-2 text-xs">
                <div className="w-4 h-4 border-2 border-[#1f5ca9]/30 border-t-[#1f5ca9] rounded-full animate-spin" />
                <span>{t('Đang tải danh sách chuyên gia...')}</span>
              </div>
            ) : candidateError ? (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
                {candidateError}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-6 text-center text-text-muted border border-dashed border-border rounded-lg text-xs">
                {searchQuery
                  ? t('Không tìm thấy chuyên gia nào phù hợp.')
                  : t('Hiện không còn chuyên gia nào khác đủ điều kiện phân công.')}
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-2 pr-0.5">
                {filteredCandidates.map(c => {
                  const isSelected = selectedCandidate?.userId === c.userId;
                  return (
                    <label
                      key={c.userId}
                      data-testid={`reassign-candidate-option-${c.userId}`}
                      onClick={() => setSelectedCandidate(c)}
                      className={`flex items-start justify-between p-3.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-2 border-[#1f5ca9] dark:border-[#60a5fa] bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                          : 'border border-border bg-surface hover:border-slate-300 dark:hover:border-slate-600 hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="radio"
                          name="reassign-candidate-selection"
                          value={c.userId}
                          checked={isSelected}
                          onChange={() => setSelectedCandidate(c)}
                          className="mt-1 w-4 h-4 text-[#1f5ca9] dark:text-[#60a5fa] focus:ring-[#1f5ca9] border-border shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-text truncate">
                            {c.fullName}
                          </div>
                          <div className="text-xs sm:text-[13px] text-text-muted break-words leading-relaxed">
                            {t('Đơn vị')}: {c.affiliation || t('Chưa cập nhật đơn vị')}
                          </div>
                          <div className="text-xs sm:text-[13px] text-text-muted break-words leading-relaxed">
                            {t('Chuyên môn')}: {c.specialties || t('Chưa cập nhật')}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1f5ca9] text-white shrink-0">
                          {t('Được chọn')}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Reason Textarea */}
          <div className="space-y-1.5">
            <label htmlFor="reassign-reason-input" className="block text-xs font-semibold text-text">
              {t('Lý do đổi người thẩm định')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reassign-reason-input"
              data-testid="reassign-reason-input"
              rows={3}
              value={reason}
              maxLength={4000}
              onChange={e => setReason(e.target.value)}
              placeholder={t('Nhập lý do điều chỉnh chuyên gia thẩm định hồ sơ này...')}
              className="w-full p-3 text-xs sm:text-sm rounded-lg border border-border bg-surface text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-[#1f5ca9] focus:border-[#1f5ca9] resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>{t('Tối thiểu 3 ký tự.')}</span>
              <span className={trimmedReason.length > 4000 ? 'text-red-600 font-bold' : ''}>
                {trimmedReason.length} / 4.000 {t('ký tự')}
              </span>
            </div>
          </div>

          {/* 4. Technical Specs Disclosure */}
          <details className="group rounded-lg border border-border p-3 bg-surface-hover/60 text-xs">
            <summary className="flex items-center justify-between cursor-pointer font-medium text-text select-none">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-text-muted">
                  tune
                </span>
                <span>{t('Chi tiết kỹ thuật')}</span>
              </span>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180"
              >
                expand_more
              </span>
            </summary>
            <div className="mt-2.5 pt-2.5 border-t border-border font-mono text-[11px] space-y-1 text-text-muted break-all">
              <div>
                revision_id: <span className="text-text">{revision.id}</span>
              </div>
              <div>
                active_assignment_id: <span className="text-text">{activeAssignment.id}</span>
              </div>
              <div>
                optimistic_version: <span className="text-text">{capturedVersion}</span>
              </div>
              <div>
                candidate_id: <span className="text-text">{selectedCandidate ? selectedCandidate.userId : '—'}</span>
              </div>
              <div className="text-[10px] text-text-muted font-sans pt-1">
                {t('Sử dụng để đối chiếu xung đột dữ liệu (HTTP 409) trong phiên làm việc.')}
              </div>
            </div>
          </details>

          {/* Error Banner */}
          {(submitError || mustVerifyReload) && (
            <div
              data-testid="reassign-error-banner"
              className="p-3.5 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 space-y-2 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0">
                  error
                </span>
                <span>
                  {submitError ||
                    t(
                      'Thao tác trước đó gặp sự cố hoặc phiên bản chưa xác định. Vui lòng tải lại và xác minh trước khi tiếp tục.'
                    )}
                </span>
              </div>
              {mustVerifyReload && onReload && (
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="reassign-verify-reload-button"
                    onClick={handleReloadAndVerify}
                    disabled={isReloading}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                  >
                    <span
                      aria-hidden="true"
                      className={`material-symbols-outlined text-sm ${isReloading ? 'animate-spin' : ''}`}
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
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-border bg-surface-hover/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="h-11 min-h-[44px] px-5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center"
          >
            {t('Hủy')}
          </button>
          <button
            type="button"
            data-testid="confirm-reassign-button"
            onClick={handleReassign}
            disabled={!isFormValid || versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="h-11 min-h-[44px] px-5 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang đổi người...') : t('Xác nhận đổi người')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
