import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { submitRevision, parseGovernanceError } from '../../api/governance';
import type { RevisionResponse } from '../../types/governance';

interface KnowledgeSubmitModalProps {
  revision: RevisionResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRevision: RevisionResponse) => void;
  onReload?: () => Promise<{ source: unknown; revision: RevisionResponse | null } | RevisionResponse | unknown> | void;
  mustVerifyReload?: boolean;
  onIndeterminateError?: () => void;
}

export default function KnowledgeSubmitModal({
  revision,
  isOpen,
  onClose,
  onSuccess,
  onReload,
  mustVerifyReload = false,
  onIndeterminateError,
}: KnowledgeSubmitModalProps) {
  useLanguage();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
      setGeneralError(null);
      setFieldErrors({});
      setIsReloading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Preflight validation for submission
  const preflightIssues: string[] = [];
  const meta = revision.metadata;

  if (!meta.title?.trim()) {
    preflightIssues.push(t('Tiêu đề tài liệu nguồn là bắt buộc.'));
  }
  if (!meta.authors?.trim() && !meta.publisher?.trim()) {
    preflightIssues.push(t('Phải có ít nhất tác giả hoặc đơn vị xuất bản.'));
  }
  if (!meta.sourceUrl?.trim() && !meta.evidenceReference?.trim()) {
    preflightIssues.push(t('Phải có đường dẫn trực tuyến (URL) hoặc căn cứ lưu trữ/trích dẫn.'));
  }
  if (
    (meta.sourceType === 'FIELD_INTERVIEW' || meta.sourceType === 'OTHER') &&
    !meta.provenanceNotes?.trim()
  ) {
    preflightIssues.push(t('Loại nguồn thực địa hoặc khác bắt buộc phải có ghi chú xuất xứ.'));
  }
  if (meta.proposedTier !== 'UNKNOWN' && !meta.proposedTierRationale?.trim()) {
    preflightIssues.push(t('Phải nêu căn cứ đề xuất khi xếp tầng A–E.'));
  }

  if (revision.chunks.length === 0) {
    preflightIssues.push(t('Hồ sơ phải có ít nhất 1 đoạn trích kiến thức (tối đa 20).'));
  } else if (revision.chunks.length > 20) {
    preflightIssues.push(t('Hồ sơ không được vượt quá 20 đoạn trích kiến thức.'));
  }

  revision.chunks.forEach((c, idx) => {
    const num = idx + 1;
    if (!c.title?.trim()) {
      preflightIssues.push(t('Đoạn trích #{0}: thiếu tiêu đề.', [num]));
    }
    if (!c.content?.trim()) {
      preflightIssues.push(t('Đoạn trích #{0}: thiếu nội dung chuẩn hóa.', [num]));
    }
    if (!c.originalExcerpt?.trim()) {
      preflightIssues.push(t('Đoạn trích #{0}: thiếu trích đoạn nguyên văn.', [num]));
    }
    if (!c.locator?.trim()) {
      preflightIssues.push(t('Đoạn trích #{0}: thiếu vị trí trích dẫn (trang, mục, biên bản).', [num]));
    }
  });

  const hasPreflightErrors = preflightIssues.length > 0;

  const handleSyncVersion = () => {
    openVersionRef.current = revision.version;
    setGeneralError(null);
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

      // If the submit mutation already committed on the server, revision is SUBMITTED or IN_REVIEW
      if (freshRev && (freshRev.status === 'SUBMITTED' || freshRev.status === 'IN_REVIEW')) {
        onSuccess(freshRev);
        onClose();
        return;
      }

      // If revision is no longer DRAFT
      if (freshRev && freshRev.status !== 'DRAFT') {
        onSuccess(freshRev);
        onClose();
        return;
      }

      if (freshRev && typeof freshRev.version === 'number') {
        openVersionRef.current = freshRev.version;
      }
      setGeneralError(null);
      setFieldErrors({});
    } catch {
      if (!isMountedRef.current || !isOpen || revision.id !== targetRevisionId) return;
      setGeneralError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      if (isMountedRef.current) {
        setIsReloading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (hasPreflightErrors || versionMismatch || isSubmitting || mustVerifyReload) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const targetRevisionId = revision.id;

    setIsSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});

    try {
      const updated = await submitRevision(revision.id, capturedVersion, controller.signal);
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || revision.id !== targetRevisionId) {
        return;
      }
      onSuccess(updated);
      onClose();
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || revision.id !== targetRevisionId) {
        return;
      }
      const parsed = parseGovernanceError(err, t('Không thể gửi thẩm định hồ sơ.'));
      setGeneralError(parsed.message);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFieldErrors(parsed.fieldErrors);
      }

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
      aria-labelledby="submit-modal-title"
      data-testid="submit-revision-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-xl max-w-[660px] w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <h2 id="submit-modal-title" className="text-base sm:text-lg font-semibold text-text">
            {t('Gửi yêu cầu thẩm định')}
          </h2>
          <button
            type="button"
            data-testid="close-submit-modal-button"
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
          {/* Context Card */}
          <div className="p-4 bg-surface dark:bg-bg rounded-lg border border-border space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-text text-base">
                {meta.title || t('Tài liệu chưa đặt tên')}
              </span>
              <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center">
                {t('Bản {0}', [revision.revisionNumber])}
              </span>
              <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border inline-flex items-center">
                {t('Bản nháp')}
              </span>
            </div>
            <p className="text-xs text-gray">
              {t('Quy mô: {0} đoạn trích nội dung', [revision.chunks.length])}
            </p>
          </div>

          {/* Preflight Checklist */}
          <div>
            <div className="text-xs font-semibold text-text mb-2.5 flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
                fact_check
              </span>
              <span>{t('Kiểm tra tiền thẩm định (Preflight Checklist)')}</span>
            </div>

            {hasPreflightErrors ? (
              <div
                data-testid="preflight-error-banner"
                className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-red-700 dark:text-red-300">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    error
                  </span>
                  <span>{t('Hồ sơ chưa đủ điều kiện gửi thẩm định ({0} lỗi)', [preflightIssues.length])}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs pl-1">
                  {preflightIssues.map((issue, idx) => (
                    <li key={idx} className="[overflow-wrap:anywhere]">{issue}</li>
                  ))}
                </ul>
                <p className="pt-1 text-[11px] text-gray">
                  {t('Vui lòng quay lại chỉnh sửa bản nháp để bổ sung đầy đủ thông tin trước khi gửi.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-surface dark:bg-bg rounded-lg border border-border flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-emerald-600 text-lg mt-0.5 shrink-0">
                    check_circle
                  </span>
                  <div className="text-xs">
                    <span className="font-semibold text-text">{t('Thuộc tính tài liệu nguồn:')}</span>
                    <span className="text-gray"> {t('Đã điền đầy đủ tiêu đề, loại tài liệu và tầng đề xuất.')}</span>
                  </div>
                </div>
                <div className="p-3 bg-surface dark:bg-bg rounded-lg border border-border flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-emerald-600 text-lg mt-0.5 shrink-0">
                    check_circle
                  </span>
                  <div className="text-xs">
                    <span className="font-semibold text-text">{t('Nội dung {0} đoạn trích:', [revision.chunks.length])}</span>
                    <span className="text-gray"> {t('Đã nhập đầy đủ tiêu đề, nội dung chuẩn hóa và trích đoạn nguyên văn.')}</span>
                  </div>
                </div>
                <div className="p-3 bg-surface dark:bg-bg rounded-lg border border-border flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-emerald-600 text-lg mt-0.5 shrink-0">
                    check_circle
                  </span>
                  <div className="text-xs">
                    <span className="font-semibold text-text">{t('Vị trí trích dẫn (Locator):')}</span>
                    <span className="text-gray" data-testid="preflight-locator-status"> {t('Đã điền thông tin vị trí trích dẫn cho tất cả đoạn trích ({0}/{1}).', [revision.chunks.length, revision.chunks.length])}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Note */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">
              info
            </span>
            <p className="text-xs text-gray leading-relaxed">
              {t('Sau khi gửi, bản ghi chuyển sang trạng thái')} <strong className="text-text font-semibold">{t('Đã gửi thẩm định (SUBMITTED)')}</strong> {t('và chờ phân công thẩm định viên. Bản nháp tạm khóa chỉnh sửa.')}
            </p>
          </div>

          {/* Stale version conflict banner */}
          {versionMismatch && (
            <div
              data-testid="version-mismatch-warning"
              className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Dữ liệu phiên bản đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện có phiên bản v{0}, khác với phiên bản được mở ban đầu (v{1}). Vui lòng xác nhận cập nhật trước khi gửi.', [revision.version, capturedVersion])}
              </p>
              <button
                type="button"
                onClick={handleSyncVersion}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer text-xs"
              >
                {t('Cập nhật lên v{0} và kiểm tra lại', [revision.version])}
              </button>
            </div>
          )}

          {/* General API error banner */}
          {(generalError || mustVerifyReload) && (
            <div
              data-testid="submit-error-banner"
              className="p-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-red-600 dark:text-red-400">
                  error
                </span>
                <span>
                  {generalError ||
                    t(
                      'Thao tác trước đó gặp sự cố hoặc phiên bản chưa xác định. Vui lòng tải lại và xác minh trước khi tiếp tục.'
                    )}
                </span>
              </div>
              {Object.keys(fieldErrors).length > 0 && (
                <ul className="list-disc list-inside text-[11px] pl-1 pt-1">
                  {Object.entries(fieldErrors).map(([field, msg]) => (
                    <li key={field}>
                      <strong>{field}:</strong> {msg}
                    </li>
                  ))}
                </ul>
              )}
              {mustVerifyReload && onReload && (
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="submit-verify-reload-button"
                    onClick={handleReloadAndVerify}
                    disabled={isReloading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f5ca9] text-white text-xs font-semibold hover:bg-[#184988] disabled:opacity-50 cursor-pointer shadow-xs"
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

          {/* Technical disclosure */}
          <details className="group border border-border rounded-lg text-xs">
            <summary className="px-3 py-2 cursor-pointer bg-surface font-medium text-gray flex items-center justify-between select-none">
              <span>{t('Chi tiết kỹ thuật & Request Token')}</span>
              <span aria-hidden="true" className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="p-3 border-t border-border font-mono bg-slate-50 dark:bg-bg text-gray space-y-1">
              <div>DraftID: {revision.id}</div>
              <div>HeadVersion: v{revision.version} · PreflightVerdict: {hasPreflightErrors ? 'FAILED' : 'PASSED'}</div>
            </div>
          </details>
        </div>

        {/* Modal actions */}
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
            data-testid="confirm-submit-button"
            onClick={handleSubmit}
            disabled={hasPreflightErrors || versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="h-11 px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-sm font-medium shadow-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang gửi...') : t('Gửi thẩm định')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
