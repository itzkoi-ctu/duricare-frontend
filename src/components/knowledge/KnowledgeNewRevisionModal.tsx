import { useState, useRef, useEffect } from 'react';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-revision-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-teal">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              post_add
            </span>
            <h2 id="new-revision-modal-title" className="text-base font-bold text-text">
              {t('Tạo phiên bản tiếp theo')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-new-rev-modal-button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              close
            </span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-gray leading-relaxed">
            {t('Bạn sắp tạo một phiên bản nháp mới (Rev #{0}) được nhân bản từ phiên bản kết thúc hiện tại (Rev #{1}).', [baseRevision.revisionNumber + 1, baseRevision.revisionNumber])}
          </p>

          <div className="p-3.5 rounded-xl bg-bg border border-border space-y-2 text-text">
            <div className="font-semibold text-gray">{t('Đặc điểm phiên bản mới')}:</div>
            <ul className="list-disc list-inside space-y-1 text-gray text-[11px] pl-1">
              <li>{t('Toàn bộ thông tin xuất bản và {0} đoạn trích sẽ được sao chép sang bản mới.', [baseRevision.chunks.length])}</li>
              <li>{t('Các định danh logic (chunkId) được giữ nguyên để bảo đảm tính truy nguyên.')}</li>
              <li>{t('Phiên bản mới sẽ có trạng thái Bản nháp (DRAFT) để bạn thoải mái chỉnh sửa.')}</li>
              <li>{t('Quyết định thẩm định của phiên bản cũ sẽ không bị sao chép sang bản mới.')}</li>
            </ul>
          </div>

          {versionMismatch && (
            <div
              data-testid="new-revision-version-mismatch"
              className="p-3.5 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-2"
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
                className="px-3 py-1.5 rounded-lg bg-amber text-surface dark:text-bg font-semibold cursor-pointer"
              >
                {t('Cập nhật lên v{0}', [baseRevision.version])}
              </button>
            </div>
          )}

          {(error || mustVerifyReload) && (
            <div
              data-testid="new-revision-error-banner"
              className="p-3 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-2 font-medium"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0">
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
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
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

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
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
            data-testid="confirm-new-revision-button"
            onClick={handleCreate}
            disabled={versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="px-4 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang tạo...') : t('Tạo và chuyển sang chỉnh sửa')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
