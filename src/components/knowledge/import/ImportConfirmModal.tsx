/**
 * FE-KNOWLEDGE-IMPORT-001 ImportConfirmModal component
 * Pre-confirmation summary, single requestId generation, exact body preservation for retries, idempotency & error handling
 * Aligned with Stitch references confirm-desktop.html & confirm-mobile.html
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { formatBytes } from '../../../utils/importUtils';
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
  const isPdf = previewSession.file.displayName.toLowerCase().endsWith('.pdf');

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

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog: max-w-[600px] */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-[600px] rounded-xl border border-border bg-surface shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-scaleUp text-left"
      >
        {/* 1. Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue/10 text-navy dark:text-blue flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">draft</span>
            </div>
            <h2 id="confirm-modal-title" className="text-lg sm:text-[20px] font-semibold text-text tracking-tight leading-snug">
              {t('Tạo bản nháp từ tài liệu')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('Đóng cửa sổ')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray hover:text-text hover:bg-border/30 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="px-6 py-5 space-y-4 text-sm leading-relaxed text-text overflow-y-auto">
          {/* Summary Card */}
          <div className="p-4 rounded-xl border border-border bg-bg/60 space-y-3">
            {/* File info row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[22px] shrink-0 ${
                    isPdf ? 'text-red-600' : 'text-sky-600'
                  }`}
                >
                  {isPdf ? 'picture_as_pdf' : 'description'}
                </span>
                <span className="text-sm font-medium text-text truncate max-w-xs sm:max-w-md">
                  {previewSession.file.displayName}
                </span>
              </div>
              {/* Uniform draft badge (24px high, rounded-md/6px, 12px font, px-2.5 py-0.5) */}
              <span
                className="h-[24px] rounded-[6px] text-[12px] px-2.5 py-0.5 bg-amber/15 text-amber border border-amber/30 font-medium inline-flex items-center whitespace-nowrap shrink-0"
                style={{ height: '24px', minHeight: '24px', borderRadius: '6px', fontSize: '12px', lineHeight: '16px' }}
              >
                {t('Bản nháp')}
              </span>
            </div>

            {/* Meta row */}
            <div className="text-xs text-gray font-normal">
              {t('Kích thước:')} {formatBytes(previewSession.file.bytes)} · {t('Quy mô:')} {chunks.length} {t('đoạn trích')}
            </div>

            {/* Tiêu đề tài liệu đã đặt */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray mb-1">
                {t('Tiêu đề tài liệu đã đặt:')}
              </label>
              <div className="bg-surface border border-border rounded-lg p-3 text-sm font-semibold text-text shadow-xs break-words">
                {metadata.title || '—'}
              </div>
            </div>

            {/* Loại nguồn tài liệu */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray mb-1">
                {t('Loại nguồn tài liệu:')}
              </label>
              <div className="bg-surface border border-border rounded-lg p-2.5 text-xs text-text flex items-center justify-between shadow-xs">
                <span>
                  {t('Loại tài liệu:')}{' '}
                  <strong className="text-text font-semibold">
                    {metadata.sourceType
                      ? t(String(SOURCE_TYPE_CONFIG[metadata.sourceType] || metadata.sourceType))
                      : t('Chưa chọn')}
                  </strong>
                </span>
                <span className="text-xs text-gray font-normal">{t('Người dùng chỉ định')}</span>
              </div>
            </div>

            {/* Ký tự bóc tách */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/80">
              <span className="text-gray">{t('Ký tự bóc tách:')}</span>
              <span className="font-semibold text-text tabular-nums">{totalCharacters.toLocaleString()} {t('ký tự')}</span>
            </div>
          </div>

          {/* Guidance note under summary */}
          <p className="text-xs text-gray italic">
            {t('Chỉ gửi yêu cầu một lần; kết quả phản hồi từ máy chủ sẽ quyết định tiến trình tiếp theo.')}
          </p>

          {/* Info block */}
          <div className="p-3.5 rounded-lg bg-blue/10 border border-blue/30 text-xs text-navy dark:text-blue space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-navy dark:text-blue">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>{t('Khởi tạo bản nháp nội bộ')}</span>
            </div>
            <p className="leading-relaxed opacity-90 text-gray">
              {t('Sau khi tạo, bạn có thể chỉnh sửa và gửi thẩm định riêng. Tài liệu chưa được đưa vào hệ thống RAG hay phục vụ trả lời AI.')}
            </p>
          </div>

          {/* Closed disclosure "Chi tiết yêu cầu & Request ID" */}
          <details className="group border border-border rounded-lg overflow-hidden">
            <summary className="p-2.5 text-xs text-gray cursor-pointer flex justify-between items-center hover:bg-border/20 transition-colors list-none select-none">
              <span className="font-medium text-text">{t('Chi tiết yêu cầu & Thông số kỹ thuật')}</span>
              <span className="material-symbols-outlined text-[16px] text-gray group-open:rotate-180 transition-transform">
                keyboard_arrow_down
              </span>
            </summary>
            <div className="p-3 bg-bg/80 border-t border-border text-[11px] font-mono text-gray space-y-1">
              <div className="flex justify-between">
                <span>Request ID:</span>
                <span className="font-semibold text-text truncate max-w-[280px]" title={preparedRequest.requestId}>
                  {preparedRequest.requestId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('Phiên bản phiên:')}</span>
                <span className="font-semibold text-text">v{preparedRequest.version}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Mã phiên:')}</span>
                <span className="font-semibold text-text truncate max-w-[280px]" title={previewSession.id}>
                  {previewSession.id}
                </span>
              </div>
            </div>
          </details>

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
        </div>

        {/* 3. Modal Footer */}
        <div className="p-4 border-t border-border bg-surface flex flex-col sm:flex-row-reverse sm:justify-end gap-2.5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Primary button (on mobile: top full-width, on desktop: right) */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || retryCountdown !== null}
            className="w-full sm:w-auto min-h-[44px] h-11 rounded-lg px-6 py-2.5 bg-navy hover:bg-navy/90 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-navy/40 dark:bg-blue dark:text-bg dark:hover:bg-blue/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-bg dark:border-t-transparent" />
                <span>{t('Đang tạo bản nháp...')}</span>
              </>
            ) : retryCountdown !== null ? (
              <>
                <span className="material-symbols-outlined text-[18px]">timer</span>
                <span>{t('Thử lại sau {0}s', [retryCountdown])}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">note_add</span>
                <span>{t('Tạo bản nháp')}</span>
              </>
            )}
          </button>
          {/* Secondary button */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto min-h-[44px] h-11 rounded-lg px-5 py-2.5 border border-border bg-surface text-text hover:bg-surface-hover font-medium text-sm flex items-center justify-center gap-1.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-navy/20 dark:focus:ring-blue/30 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px] text-gray">arrow_back</span>
            <span>{t('Quay lại chỉnh sửa')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
