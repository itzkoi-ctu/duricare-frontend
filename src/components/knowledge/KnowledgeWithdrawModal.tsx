import { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { withdrawRevision, parseGovernanceError } from '../../api/governance';
import type { RevisionResponse } from '../../types/governance';

interface KnowledgeWithdrawModalProps {
  revision: RevisionResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRevision: RevisionResponse) => void;
  onReload?: () => Promise<{ source: unknown; revision: RevisionResponse | null } | RevisionResponse | unknown> | void;
  mustVerifyReload?: boolean;
  onIndeterminateError?: () => void;
}

export default function KnowledgeWithdrawModal({
  revision,
  isOpen,
  onClose,
  onSuccess,
  onReload,
  mustVerifyReload = false,
  onIndeterminateError,
}: KnowledgeWithdrawModalProps) {
  useLanguage();

  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState<boolean>(false);

  const openVersionRef = useRef<number | null>(null);

  if (isOpen && openVersionRef.current === null) {
    openVersionRef.current = revision.version;
  } else if (!isOpen && openVersionRef.current !== null) {
    openVersionRef.current = null;
  }

  const capturedVersion = openVersionRef.current ?? revision.version;
  const versionMismatch = openVersionRef.current !== null && revision.version !== openVersionRef.current;

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError(null);
      setIsReloading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 3 && trimmedReason.length <= 4000;

  const handleSyncVersion = () => {
    openVersionRef.current = revision.version;
    setError(null);
  };

  const handleReloadAndVerify = async () => {
    if (!onReload) return;
    setIsReloading(true);
    try {
      const res = await onReload();
      const freshRev =
        (res as { revision?: RevisionResponse | null })?.revision ??
        (res as RevisionResponse | null) ??
        revision;

      // If the withdraw mutation already committed on the server, revision is now WITHDRAWN
      if (freshRev && freshRev.status === 'WITHDRAWN') {
        onSuccess(freshRev);
        onClose();
        return;
      }

      // If revision is no longer in a withdrawable status (SUBMITTED / IN_REVIEW)
      if (freshRev && freshRev.status !== 'SUBMITTED' && freshRev.status !== 'IN_REVIEW') {
        onSuccess(freshRev);
        onClose();
        return;
      }

      if (freshRev && typeof freshRev.version === 'number') {
        openVersionRef.current = freshRev.version;
      }
      setError(null);
    } catch {
      setError(t('Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.'));
    } finally {
      setIsReloading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isReasonValid || versionMismatch || isSubmitting || mustVerifyReload) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await withdrawRevision(revision.id, capturedVersion, trimmedReason);
      onSuccess(updated);
      onClose();
    } catch (err) {
      const parsed = parseGovernanceError(err, t('Không thể rút hồ sơ thẩm định.'));
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
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-coral">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              archive
            </span>
            <h2 id="withdraw-modal-title" className="text-base font-bold text-text">
              {t('Rút hồ sơ thẩm định')}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-withdraw-modal-button"
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
            {t('Bạn đang yêu cầu rút phiên bản Rev #{0} (v{1}) khỏi quá trình thẩm định. Nếu hồ sơ đang được phân công chuyên gia, nhiệm vụ thẩm định sẽ bị hủy tự động.', [revision.revisionNumber, capturedVersion])}
          </p>

          {versionMismatch && (
            <div
              data-testid="withdraw-version-mismatch"
              className="p-3.5 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  warning
                </span>
                <span>{t('Phiên bản đã thay đổi trên máy chủ')}</span>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện có phiên bản v{0} (khác v{1}). Vui lòng cập nhật trước khi xác nhận.', [revision.version, capturedVersion])}
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

          <div>
            <label htmlFor="withdraw-reason" className="block text-gray font-semibold mb-1">
              {t('Lý do rút hồ sơ')} <span className="text-coral">*</span>
            </label>
            <textarea
              id="withdraw-reason"
              data-testid="withdraw-reason-input"
              rows={4}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('Nhập lý do chi tiết (ví dụ: cần cập nhật thêm trích đoạn, phát hiện sai sót dữ liệu...)')}
              className="w-full rounded-xl border border-border bg-bg p-3 text-xs text-text placeholder:text-gray/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral"
            />
            <div className="flex items-center justify-between text-[11px] text-gray mt-1">
              <span>{t('Tối thiểu 3 ký tự, tối đa 4000 ký tự.')}</span>
              <span className={trimmedReason.length > 4000 ? 'text-coral font-bold' : ''}>
                {trimmedReason.length}/4000
              </span>
            </div>
          </div>

          {(error || mustVerifyReload) && (
            <div
              data-testid="withdraw-error-banner"
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
                    data-testid="withdraw-verify-reload-button"
                    onClick={handleReloadAndVerify}
                    disabled={isReloading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral text-white text-xs font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
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
            data-testid="confirm-withdraw-button"
            onClick={handleWithdraw}
            disabled={!isReasonValid || versionMismatch || isSubmitting || isReloading || mustVerifyReload}
            className="px-4 py-2 rounded-xl bg-coral text-white text-xs font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isSubmitting ? t('Đang xử lý...') : t('Xác nhận rút hồ sơ')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
