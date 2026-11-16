/**
 * FE-KNOWLEDGE-IMPORT-001 RevisionProvenanceModal component
 * Displays origin, snapshot status (CURRENT / STALE_SNAPSHOT), document extraction info, and chunk lineage
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type { ProvenanceView, ChunkLineage } from '../../../types/import';
import { getRevisionProvenance, parseImportError, type ParsedImportError } from '../../../api/import';
import { formatBytes, formatDate, LOCATOR_STATUS_CONFIG } from '../../../utils/importUtils';

interface RevisionProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisionId: string;
}

export default function RevisionProvenanceModal({
  isOpen,
  onClose,
  revisionId,
}: RevisionProvenanceModalProps) {
  useLanguage();
  const [provenance, setProvenance] = useState<ProvenanceView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ParsedImportError | null>(null);

  const fetchGenRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen && revisionId) {
      const currentGen = ++fetchGenRef.current;
      setLoading(true);
      setError(null);
      getRevisionProvenance(revisionId)
        .then((data: ProvenanceView) => {
          if (fetchGenRef.current !== currentGen) return;
          setProvenance(data);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (fetchGenRef.current !== currentGen) return;
          setError(parseImportError(err, t('Không thể tải thông tin nguồn gốc của phiên bản này.')));
          setLoading(false);
        });
    } else {
      setProvenance(null);
    }
    return () => {
      fetchGenRef.current++;
    };
  }, [isOpen, revisionId]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
      data-testid="revision-provenance-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-xl max-w-[660px] w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary text-2xl"
            >
              description
            </span>
            <h2 id="provenance-modal-title" className="text-base sm:text-lg font-semibold text-text">
              {t('Nguồn gốc & Truy nguyên tệp gốc')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Đóng')}
            data-testid="close-provenance-modal-button"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-gray hover:bg-surface-hover hover:text-text transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Loading */}
          {loading && (
            <div className="py-12 text-center text-gray space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs">{t('Đang truy vấn thông tin nguồn gốc tài liệu...')}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs">
              <p className="font-semibold">{error.message}</p>
            </div>
          )}

          {/* Provenance Details */}
          {!loading && provenance && (
            <div className="space-y-4">
              {/* Status & Origin Badge Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface dark:bg-bg rounded-lg border border-border text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray">{t('Nguồn gốc:')}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-[6px] h-6 px-2.5 text-xs font-semibold leading-none ${
                      provenance.origin === 'IMPORTED'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">
                      {provenance.origin === 'IMPORTED' ? 'upload_file' : 'edit'}
                    </span>
                    <span>{provenance.origin === 'IMPORTED' ? t('Nhập từ tệp tài liệu') : t('Soạn thảo thủ công')}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray">{t('Trạng thái đối chiếu:')}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-[6px] h-6 px-2.5 text-xs font-semibold leading-none ${
                      provenance.status === 'CURRENT'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : provenance.status === 'STALE_SNAPSHOT'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">
                      {provenance.status === 'CURRENT'
                        ? 'verified'
                        : provenance.status === 'STALE_SNAPSHOT'
                        ? 'update'
                        : 'info'}
                    </span>
                    <span>
                      {provenance.status === 'CURRENT'
                        ? t('Bản ghi gốc hiện hành (CURRENT)')
                        : provenance.status === 'STALE_SNAPSHOT'
                        ? t('Đã sửa đổi sau khi nhập (STALE_SNAPSHOT)')
                        : t('Không áp dụng')}
                    </span>
                  </span>
                </div>
              </div>

              {/* MANUAL Origin Explanation */}
              {provenance.origin === 'MANUAL' && (
                <div className="rounded-xl border border-border bg-surface dark:bg-bg p-6 text-center text-xs text-gray space-y-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-3xl text-gray mb-1">
                    history_edu
                  </span>
                  <p className="font-semibold text-text text-sm">
                    {t('Phiên bản được soạn thảo trực tiếp trên hệ thống')}
                  </p>
                  <p className="max-w-md mx-auto leading-relaxed">
                    {t(
                      'Hồ sơ nguồn này được tác giả nhập thủ công thông qua biểu mẫu của hệ thống, không qua tiến trình chuyển đổi tài liệu tự động.'
                    )}
                  </p>
                </div>
              )}

              {/* IMPORTED Details */}
              {provenance.origin === 'IMPORTED' && provenance.document && (
                <>
                  {/* Document Information Card */}
                  <div className="p-4 bg-surface dark:bg-bg rounded-lg border border-border flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl shrink-0"
                    >
                      picture_as_pdf
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text truncate">
                        {provenance.document.file.displayName}
                      </div>
                      <div className="text-xs text-gray mt-0.5">
                        {provenance.document.file.mediaType || 'application/pdf'} · {formatBytes(provenance.document.file.bytes)}
                        {provenance.snapshot?.savedAt && ` · Nhập hệ thống: ${formatDate(provenance.snapshot.savedAt)}`}
                      </div>
                    </div>
                  </div>

                  {/* Detail rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-border bg-surface dark:bg-bg">
                      <div className="text-[11px] text-gray uppercase tracking-wider font-semibold">
                        {t('Trình bóc tách:')}
                      </div>
                      <div className="font-medium text-text mt-1">
                        {provenance.document.extraction.parser} ({provenance.document.extraction.parserVersion})
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-surface dark:bg-bg">
                      <div className="text-[11px] text-gray uppercase tracking-wider font-semibold">
                        {t('Cơ chế lưu trữ:')}
                      </div>
                      <div className="font-medium text-text mt-1" data-testid="provenance-storage-mechanism">
                        {provenance.status === 'CURRENT'
                          ? t('Bản chụp tham chiếu hiện hành')
                          : provenance.status === 'STALE_SNAPSHOT'
                          ? t('Bản chụp lịch sử (đã sửa đổi)')
                          : t('Bản chụp tham chiếu')}
                      </div>
                    </div>
                  </div>

                  {/* Locator Lineage Section */}
                  {provenance.snapshot && provenance.snapshot.chunks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-base text-primary"
                        >
                          account_tree
                        </span>
                        <span>{t('Truy nguyên vị trí trích dẫn (Locator Lineage)')}</span>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {provenance.snapshot.chunks.map((ch: ChunkLineage, idx: number) => {
                          const statusCfg = LOCATOR_STATUS_CONFIG[ch.locatorStatus] || {
                            label: ch.locatorStatus,
                            badgeClass: 'bg-slate-100 text-slate-700',
                            icon: 'info',
                          };
                          return (
                            <div
                              key={ch.chunkId}
                              className="p-3 bg-surface dark:bg-bg rounded-lg border border-border flex items-center justify-between text-xs gap-3"
                            >
                              <div className="text-text min-w-0 truncate">
                                <strong className="font-medium">{t('Đoạn {0}:', [idx + 1])}</strong>{' '}
                                <span className="text-gray">{ch.locator || t('Chưa xác định')}</span>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-[6px] h-6 px-2.5 text-xs font-semibold leading-none shrink-0 ${statusCfg.badgeClass}`}
                              >
                                <span aria-hidden="true" className="material-symbols-outlined text-xs">
                                  {statusCfg.icon}
                                </span>
                                <span>{t(statusCfg.label)}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Technical disclosure */}
                  <details className="group border border-border rounded-lg text-xs">
                    <summary className="px-3 py-2 cursor-pointer bg-surface font-medium text-gray flex items-center justify-between select-none">
                      <span>{t('Mã băm SHA-256 & Định danh lưu trữ')}</span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-sm transition-transform group-open:rotate-180"
                      >
                        expand_more
                      </span>
                    </summary>
                    <div className="p-3 border-t border-border font-mono bg-slate-50 dark:bg-bg text-gray break-all space-y-1">
                      <div>sha256: {provenance.document.file.sha256}</div>
                      <div>textSha256: {provenance.document.extraction.textSha256}</div>
                      {provenance.snapshot?.metadataSha256 && (
                        <div>metaSha256: {provenance.snapshot.metadataSha256}</div>
                      )}
                    </div>
                  </details>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-surface-hover/30 border-t border-border flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface-hover transition-colors shadow-xs cursor-pointer"
          >
            {t('Đóng')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
