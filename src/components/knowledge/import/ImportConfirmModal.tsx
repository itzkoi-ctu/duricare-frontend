/**
 * FE-KNOWLEDGE-IMPORT-001 ImportConfirmModal component
 * Pre-confirmation summary, single requestId generation, exact body preservation for retries, idempotency & error handling
 */

import { useState, useEffect } from 'react';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type {
  PreviewSession,
  ConfirmRequest,
  ConfirmReceipt,
} from '../../../types/import';
import type { KnowledgeMetadata } from '../../../types/governance';
import type { ChunkEditorState } from './ImportChunkEditor';
import { confirmImportDraft, parseImportError, type ParsedImportError } from '../../../api/import';
import { SOURCE_TYPE_CONFIG } from '../../../utils/governanceStatus';

interface ImportConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewSession: PreviewSession;
  preparedRequest: ConfirmRequest;
  metadata: KnowledgeMetadata;
  chunks: ChunkEditorState[];
  onConfirmSuccess: (receipt: ConfirmReceipt) => void;
  onRecordOutcome?: (outcome: 'uncertain' | 'error' | 'success', fieldErrors?: Record<string, string>) => void;
}

export default function ImportConfirmModal({
  isOpen,
  onClose,
  previewSession,
  preparedRequest,
  metadata,
  chunks,
  onConfirmSuccess,
  onRecordOutcome,
}: ImportConfirmModalProps) {
  useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<ParsedImportError | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Countdown for 429 Retry-After
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  if (!isOpen) return null;

  const totalCharacters = chunks.reduce((sum, c) => sum + c.chunk.content.length, 0);

  const handleConfirm = async () => {
    if (submitting) return;

    setSubmitting(true);
    setConfirmError(null);

    try {
      // Re-use exact preserved request body and requestId (for idempotent replay / retry)
      const receipt = await confirmImportDraft(previewSession.id, preparedRequest);
      setSubmitting(false);
      onRecordOutcome?.('success');
      onConfirmSuccess(receipt);
    } catch (err: unknown) {
      setSubmitting(false);
      const parsed = parseImportError(err, t('Không thể xác nhận tạo bản nháp tri thức.'));
      setConfirmError(parsed);

      // Distinguish a definitive client validation rejection (HTTP 400) from an unknown commit result (network, 5xx, etc.)
      const isDefinitiveValidation = parsed.status === 400;

      if (isDefinitiveValidation) {
        onRecordOutcome?.('error', parsed.fieldErrors);
      } else {
        onRecordOutcome?.('uncertain');
      }

      if (parsed.retryAfterSeconds) {
        setRetryCountdown(parsed.retryAfterSeconds);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-navy dark:text-blue text-2xl">
              verified
            </span>
            <h3 className="text-base font-bold text-text">{t('Xác nhận tạo bản nháp tri thức')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray hover:text-text rounded-lg p-1 hover:bg-border/40 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Summary */}
        <div className="rounded-xl border border-border bg-bg p-4 space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-border/60">
            <span className="text-gray font-medium">{t('Tệp tài liệu gốc:')}</span>
            <span className="font-semibold text-text truncate max-w-xs">{previewSession.file.displayName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/60">
            <span className="text-gray font-medium">{t('Tiêu đề nguồn:')}</span>
            <span className="font-semibold text-text truncate max-w-xs">{metadata.title || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/60">
            <span className="text-gray font-medium">{t('Loại nguồn:')}</span>
            <span className="font-semibold text-text">
              {metadata.sourceType ? t(String(SOURCE_TYPE_CONFIG[metadata.sourceType] || metadata.sourceType)) : t('Chưa chọn')}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/60">
            <span className="text-gray font-medium">{t('Số mảnh tri thức:')}</span>
            <span className="font-bold text-navy dark:text-blue">{chunks.length} {t('mảnh')}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/60">
            <span className="text-gray font-medium">{t('Tổng ký tự các mảnh:')}</span>
            <span className="font-semibold text-text">{totalCharacters.toLocaleString()} {t('ký tự')}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray font-medium">{t('Mã yêu cầu (requestId):')}</span>
            <span className="font-mono text-[11px] text-gray truncate max-w-[200px]" title={preparedRequest.requestId}>
              {preparedRequest.requestId}
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="rounded-xl border border-blue/30 bg-blue/10 p-3 text-xs text-blue dark:bg-blue/20">
          <p className="font-medium flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-base">info</span>
            {t('Quy trình tiếp theo sau khi tạo bản nháp (DRAFT)')}
          </p>
          <p className="leading-relaxed opacity-90">
            {t('Hồ sơ tri thức mới sẽ được lưu ở trạng thái Bản nháp (DRAFT). Bạn có thể tiếp tục chỉnh sửa, bổ sung thông tin và chủ động gửi hồ sơ sang quy trình thẩm định độc lập khi hoàn tất.')}
          </p>
        </div>

        {/* Error Display */}
        {confirmError && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 p-3.5 text-xs text-coral dark:bg-coral/20 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{confirmError.error} ({confirmError.status})</span>
              {confirmError.code && (
                <span className="font-mono text-[10px] rounded bg-coral/20 px-1 py-0.5">
                  {confirmError.code}
                </span>
              )}
            </p>
            <p className="leading-relaxed">{confirmError.message}</p>
            {Object.keys(confirmError.fieldErrors).length > 0 && (
              <ul className="mt-1 list-disc list-inside space-y-0.5 pl-1">
                {Object.entries(confirmError.fieldErrors).map(([field, msg]) => (
                  <li key={field}>
                    <span className="font-semibold">{field}:</span> {String(msg)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border bg-bg px-4 py-2 text-xs font-semibold text-text hover:bg-border/40 transition-colors disabled:opacity-40"
          >
            {t('Quay lại chỉnh sửa')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || retryCountdown !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-navy/90 transition-all focus:outline-none focus:ring-2 focus:ring-navy/40 dark:bg-blue dark:text-bg dark:hover:bg-blue/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-bg dark:border-t-transparent" />
                <span>{t('Đang tạo bản nháp...')}</span>
              </>
            ) : retryCountdown !== null ? (
              <>
                <span className="material-symbols-outlined text-base">timer</span>
                <span>{t('Thử lại sau {0}s', [retryCountdown])}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">check</span>
                <span>{t('Đồng ý và Tạo DRAFT')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
