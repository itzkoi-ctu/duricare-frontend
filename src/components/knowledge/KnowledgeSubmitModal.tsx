import { useState, useRef, useEffect } from 'react';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2 text-navy dark:text-blue">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              send
            </span>
            <h2 id="submit-modal-title" className="text-base font-bold text-text">
              {t('Gửi hồ sơ thẩm định chuyên môn')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-submit-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              close
            </span>
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
          {/* Version banner */}
          <div className="p-3 rounded-xl bg-bg border border-border flex items-center justify-between">
            <span className="text-gray">
              {t('Phiên bản gửi')}: <strong className="text-text font-mono">Rev #{revision.revisionNumber} (v{capturedVersion})</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-gray/10 text-gray text-[11px] font-mono">
              ID: {revision.id.slice(0, 8)}...
            </span>
          </div>

          {/* Version mismatch alert */}
          {versionMismatch && (
            <div
              data-testid="version-mismatch-warning"
              className="p-3.5 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-2"
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
                className="px-3 py-1.5 rounded-lg bg-amber text-surface dark:text-bg font-semibold cursor-pointer"
              >
                {t('Cập nhật lên v{0} và kiểm tra lại', [revision.version])}
              </button>
            </div>
          )}

          {/* Preflight validation errors */}
          {hasPreflightErrors ? (
            <div
              data-testid="preflight-error-banner"
              className="p-4 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-2"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
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
              <p className="pt-1 text-[11px] text-gray dark:text-gray/80">
                {t('Vui lòng quay lại chỉnh sửa bản nháp để bổ sung đầy đủ thông tin trước khi gửi.')}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-teal/30 bg-teal/5 text-text space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  check_circle
                </span>
                <span>{t('Hồ sơ đã thỏa mãn các điều kiện tiên quyết')}</span>
              </div>
              <p className="text-gray leading-relaxed">
                {t('Hồ sơ có {0} đoạn trích kiến thức và đầy đủ thông tin xuất xứ. Khi gửi:', [revision.chunks.length])}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray text-[11px] pl-1">
                <li>{t('Hồ sơ sẽ trở thành bản bất biến (read-only snapshot) không thể sửa đổi tiếp.')}</li>
                <li>{t('Chuyển vào hàng đợi thẩm định của quản trị viên để phân công chuyên gia.')}</li>
                <li>{t('Bạn có thể rút hồ sơ kèm lý do bắt buộc nếu cần điều chỉnh.')}</li>
              </ul>
            </div>
          )}

          {/* General API error or indeterminate lock banner */}
          {(generalError || mustVerifyReload) && (
            <div
              data-testid="submit-error-banner"
              className="p-3.5 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
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
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
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

        {/* Modal actions */}
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
            data-testid="confirm-submit-button"
            onClick={handleSubmit}
            disabled={hasPreflightErrors || versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="px-4 py-2 rounded-xl bg-navy text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang gửi...') : t('Xác nhận gửi thẩm định')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
