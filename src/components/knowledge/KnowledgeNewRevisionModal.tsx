import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { createNextRevision, parseGovernanceError } from '../../api/governance';
import type { SourceResponse, RevisionResponse } from '../../types/governance';

interface KnowledgeNewRevisionModalProps {
  source: SourceResponse;
  baseRevision: RevisionResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newRevision: RevisionResponse) => void;
  onReload?: () => Promise<{ source: unknown; revision: RevisionResponse | null } | RevisionResponse | unknown> | void;
  mustVerifyReload?: boolean;
  onIndeterminateError?: () => void;
}

export default function KnowledgeNewRevisionModal({
  source,
  baseRevision,
  isOpen,
  onClose,
  onSuccess,
  onReload,
  mustVerifyReload = false,
  onIndeterminateError,
}: KnowledgeNewRevisionModalProps) {
  useLanguage();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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
    openVersionRef.current = baseRevision.version;
  } else if (!isOpen && openVersionRef.current !== null) {
    openVersionRef.current = null;
  }

  const capturedVersion = openVersionRef.current ?? baseRevision.version;
  const versionMismatch = openVersionRef.current !== null && baseRevision.version !== openVersionRef.current;

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      setError(null);
      setIsReloading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncVersion = () => {
    openVersionRef.current = baseRevision.version;
    setError(null);
  };

  const handleReloadAndVerify = async () => {
    if (!onReload) return;
    const targetSourceId = source.id;
    const targetRevisionId = baseRevision.id;
    setIsReloading(true);
    try {
      const res = await onReload();
      if (!isMountedRef.current || !isOpen || source.id !== targetSourceId || baseRevision.id !== targetRevisionId) return;
      const freshSource = (res as { source?: SourceResponse })?.source;
      const freshRev =
        (res as { revision?: RevisionResponse | null })?.revision ??
        (res as RevisionResponse | null) ??
        baseRevision;

      // If a subsequent revision was already created on the server
      if (
        freshSource &&
        freshSource.latestRevision &&
        freshSource.latestRevision.revisionNumber > baseRevision.revisionNumber
      ) {
        onClose();
        navigate(`/knowledge/sources/${source.id}`);
        return;
      }

      if (freshRev && typeof freshRev.version === 'number') {
        openVersionRef.current = freshRev.version;
      }
      setError(null);
    } catch {
      if (!isMountedRef.current || !isOpen || source.id !== targetSourceId || baseRevision.id !== targetRevisionId) return;
      setError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      if (isMountedRef.current) {
        setIsReloading(false);
      }
    }
  };

  const handleCreate = async () => {
    if (versionMismatch || isSubmitting || mustVerifyReload) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const targetSourceId = source.id;
    const targetRevisionId = baseRevision.id;

    setIsSubmitting(true);
    setError(null);

    try {
      const newRev = await createNextRevision(source.id, baseRevision.id, capturedVersion, controller.signal);
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || source.id !== targetSourceId || baseRevision.id !== targetRevisionId) {
        return;
      }
      if (onSuccess) {
        onSuccess(newRev);
      }
      onClose();
      // Navigate directly to editing the new draft revision
      navigate(`/knowledge/sources/${source.id}/revisions/${newRev.id}/edit`);
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted || !isOpen || source.id !== targetSourceId || baseRevision.id !== targetRevisionId) {
        return;
      }
      const parsed = parseGovernanceError(err, t('Không thể tạo phiên bản mới.'));
      setError(parsed.message);

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

  const sourceTitle = baseRevision.metadata?.title || baseRevision.title || source.latestRevision?.title || '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-revision-modal-title"
      data-testid="new-revision-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-xl w-[520px] max-w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto">
        {/* Header modal */}
        <div className="p-5 border-b border-border flex items-start justify-between shrink-0 bg-surface">
          <div className="space-y-1 pr-2">
            <h2 id="new-revision-modal-title" className="text-[20px] font-semibold text-text leading-tight">
              {t('Tạo phiên bản tiếp theo')}
            </h2>
            <p className="text-xs text-gray truncate max-w-[380px]" title={sourceTitle}>
              {t('Tài liệu: {0}', [sourceTitle])}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-new-rev-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('Đóng hộp thoại')}
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-lg text-gray hover:text-text hover:bg-surface-hover transition-colors shrink-0"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </div>

        {/* Body modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-sm text-text flex-1">
          {/* Summary Box */}
          <div className="bg-[#f8f9ff] dark:bg-bg border border-border rounded-lg p-3.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-text text-sm">
                {t('Bản {0} → Bản {1}', [baseRevision.revisionNumber, baseRevision.revisionNumber + 1])}
              </span>
              <span className="border border-border bg-slate-100 dark:bg-surface text-slate-700 dark:text-text text-xs px-2.5 py-0.5 rounded-[6px] h-6 inline-flex items-center font-medium leading-none">
                {t('Bản nháp')}
              </span>
            </div>
            <span className="text-xs text-gray font-medium">
              {t('{0} đoạn trích', [baseRevision.chunks.length])}
            </span>
          </div>

          {/* Purpose Paragraph */}
          <p className="text-sm text-text leading-relaxed">
            {t('Tạo phiên bản tiếp theo từ bản đã kết thúc để tiếp tục chỉnh sửa.')}
          </p>

          {/* 3 Bullet Outcomes */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 text-sm text-text">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#1f5ca9] dark:text-blue-400 shrink-0 mt-0.5">
                check_circle
              </span>
              <span className="leading-normal">
                {t('Sao chép thông tin tài liệu và {0} đoạn trích', [baseRevision.chunks.length])}
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-text">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#1f5ca9] dark:text-blue-400 shrink-0 mt-0.5">
                check_circle
              </span>
              <span className="leading-normal">
                {t('Giữ liên kết truy nguyên của các đoạn trích')}
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-text">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#1f5ca9] dark:text-blue-400 shrink-0 mt-0.5">
                check_circle
              </span>
              <span className="leading-normal">
                {t('Bản mới cần được thẩm định lại')}
              </span>
            </div>
          </div>

          {/* Collapsible Disclosure: Chi tiết sao chép */}
          <details className="group border border-border rounded-lg bg-surface-hover/30 p-3 transition-all duration-150">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none text-xs font-medium text-text">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray">
                  info
                </span>
                <span>{t('Chi tiết sao chép')}</span>
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray transition-transform duration-150 group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="pt-3 mt-2 border-t border-border/80 space-y-1.5 text-xs text-gray leading-relaxed">
              <p>• {t('Mã định danh trích đoạn ({0}) được bảo toàn nguyên trạng nhằm phục vụ liên kết ngược.', ['chunkId'])}</p>
              <p>• {t('Các quyết định phê duyệt và nhận xét thẩm định của Bản {0} sẽ không tự động chuyển tiếp sang phiên bản mới.', [baseRevision.revisionNumber])}</p>
              <p>• {t('Trạng thái ban đầu của bản ghi mới được xác lập là {0}.', [t('Bản nháp (DRAFT)')])}</p>
            </div>
          </details>

          {/* Version Mismatch Alert */}
          {versionMismatch && (
            <div
              data-testid="new-revision-version-mismatch"
              className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Phiên bản đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện có phiên bản v{0} (khác v{1}). Vui lòng cập nhật trước khi xác nhận.', [baseRevision.version, capturedVersion])}
              </p>
              <button
                type="button"
                onClick={handleSyncVersion}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer text-xs"
              >
                {t('Cập nhật lên v{0}', [baseRevision.version])}
              </button>
            </div>
          )}

          {/* Error Banner */}
          {(error || mustVerifyReload) && (
            <div
              data-testid="new-revision-error-banner"
              className="p-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs space-y-2 font-medium"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0 text-red-600 dark:text-red-400">
                  error
                </span>
                <span>
                  {error ||
                    t(
                      'Thao tác trước đó gặp sự cố hoặc phiên bản chưa xác định. Vui lòng tải lại và xác minh trước khi tiếp tục.'
                    )}
                </span>
              </div>
              {mustVerifyReload && onReload && (
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="new-rev-verify-reload-button"
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

          {/* Next Action Guidance Note */}
          <p className="text-xs text-gray italic">
            {t('Sau khi tạo, bạn sẽ chuyển đến trang chỉnh sửa.')}
          </p>
        </div>

        {/* Footer modal */}
        <div className="p-4 px-6 bg-slate-50/80 dark:bg-surface-hover/30 border-t border-border flex items-center justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReloading}
            className="h-11 px-5 rounded-lg border border-border bg-surface text-text font-medium text-sm hover:bg-surface-hover transition-colors"
          >
            {t('Hủy')}
          </button>
          <button
            type="button"
            data-testid="confirm-new-revision-button"
            onClick={handleCreate}
            disabled={versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="h-11 px-6 rounded-lg bg-[#1f5ca9] text-white font-medium text-sm hover:bg-[#184988] transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang tạo...') : t('Tạo và chỉnh sửa')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
