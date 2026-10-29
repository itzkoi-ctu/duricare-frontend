import { useState, useRef, useEffect } from 'react';
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
        // Reassignment succeeded or revision transitioned; close modal
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2 text-amber">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              published_with_changes
            </span>
            <h2 id="reassign-modal-title" className="text-base font-bold text-text">
              {t('Đổi chuyên gia thẩm định')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-reassign-modal-button"
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
          {/* Current Reviewer Warning */}
          <div className="p-3.5 rounded-xl bg-amber/10 border border-amber/30 space-y-1.5 text-amber">
            <div className="font-bold flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                info
              </span>
              <span>{t('Người thẩm định hiện tại')}: {activeAssignment.reviewerDisplayName} (#{activeAssignment.reviewerUserId})</span>
            </div>
            <p className="text-[11px] leading-relaxed text-text/80">
              {t('Khi đổi người, phân công cũ sẽ chuyển thành ĐÃ THAY THẾ (REPLACED) và chuyên gia cũ sẽ mất quyền truy cập vào hồ sơ này.')}
            </p>
          </div>

          {/* Version Mismatch Warning */}
          {versionMismatch && (
            <div
              data-testid="reassign-version-mismatch"
              className="p-3.5 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Phiên bản hồ sơ đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện có phiên bản v{0} (khác v{1}). Vui lòng cập nhật phiên bản trước khi đổi người.', [revision.version, capturedVersion])}
              </p>
              <button
                type="button"
                onClick={handleSyncVersion}
                className="px-3 py-1.5 rounded-lg bg-amber text-surface dark:text-bg font-semibold cursor-pointer"
              >
                {t('Cập nhật lên v{0}', [revision.version])}
              </button>
            </div>
          )}

          {/* New Reviewer Candidate Selection */}
          <div className="space-y-2">
            <label className="block text-gray font-semibold">
              {t('Chọn chuyên gia thay thế')} <span className="text-coral">*</span>
            </label>

            <div className="relative">
              <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-gray text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                data-testid="reassign-candidate-search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Tìm chuyên gia thay thế...')}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-xs text-text placeholder:text-gray/60 focus:outline-none focus:border-amber"
              />
            </div>

            {loadingCandidates ? (
              <div className="py-8 text-center text-gray flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                <span>{t('Đang tải danh sách chuyên gia...')}</span>
              </div>
            ) : candidateError ? (
              <div className="p-3 rounded-xl border border-coral/30 bg-coral/10 text-coral">
                {candidateError}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-6 text-center text-gray border border-dashed border-border rounded-xl">
                {searchQuery ? t('Không tìm thấy chuyên gia nào phù hợp.') : t('Hiện không còn chuyên gia nào khác đủ điều kiện phân công.')}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-xl p-1.5 bg-bg/40">
                {filteredCandidates.map(c => {
                  const isSelected = selectedCandidate?.userId === c.userId;
                  return (
                    <button
                      key={c.userId}
                      type="button"
                      data-testid={`reassign-candidate-option-${c.userId}`}
                      onClick={() => setSelectedCandidate(c)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-amber bg-amber/10 text-text shadow-xs'
                          : 'border-transparent bg-surface hover:border-border text-text'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          <span className="truncate">{c.fullName}</span>
                          <span className="text-[10px] font-mono text-gray">#{c.userId}</span>
                        </div>
                        <div className="text-[11px] text-gray truncate">
                          {c.affiliation || t('Chưa cập nhật đơn vị')}
                          {c.specialties ? ` • ${c.specialties}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span
                          aria-hidden="true"
                          className={`material-symbols-outlined text-lg ${
                            isSelected ? 'text-amber' : 'text-gray/40'
                          }`}
                        >
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reassignment Reason */}
          <div>
            <label htmlFor="reassign-reason" className="block text-gray font-semibold mb-1">
              {t('Lý do đổi người thẩm định')} <span className="text-coral">*</span>
            </label>
            <textarea
              id="reassign-reason"
              data-testid="reassign-reason-input"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('Ví dụ: Chuyên gia trước bận công tác đột xuất, chuyển giao cho chuyên gia cùng bộ môn...')}
              className="w-full rounded-xl border border-border bg-bg p-3 text-xs text-text placeholder:text-gray/60 focus:outline-none focus:border-amber"
            />
            <div className="flex items-center justify-between text-[11px] text-gray mt-1">
              <span>{t('Tối thiểu 3 ký tự, tối đa 4000 ký tự.')}</span>
              <span className={trimmedReason.length > 4000 ? 'text-coral font-bold' : ''}>
                {trimmedReason.length}/4000
              </span>
            </div>
          </div>

          {(submitError || mustVerifyReload) && (
            <div
              data-testid="reassign-error-banner"
              className="p-3 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-2 font-medium"
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
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
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

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="px-4 py-2 rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg text-xs font-semibold cursor-pointer"
          >
            {t('Hủy bỏ')}
          </button>
          <button
            type="button"
            data-testid="confirm-reassign-button"
            onClick={handleReassign}
            disabled={!isFormValid || versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="px-4 py-2 rounded-xl bg-amber text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang đổi người...') : t('Xác nhận đổi người')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
