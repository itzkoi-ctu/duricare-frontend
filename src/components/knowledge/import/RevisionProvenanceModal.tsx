/**
 * FE-KNOWLEDGE-IMPORT-001 RevisionProvenanceModal component
 * Displays origin, snapshot status (CURRENT / STALE_SNAPSHOT), document extraction info, and chunk lineage
 */

import { useState, useEffect, useRef } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-navy dark:text-blue text-2xl">
              account_tree
            </span>
            <div>
              <h3 className="text-base font-bold text-text">{t('Nguồn gốc dữ liệu phiên bản (Provenance)')}</h3>
              <p className="text-xs text-gray">
                {t('Truy xuất nguồn gốc tệp tài liệu, tiến trình trích xuất và trạng thái snapshot của phiên bản.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray hover:text-text rounded-lg p-1 hover:bg-border/40 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center text-gray">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent dark:border-blue dark:border-t-transparent" />
            <p className="mt-2 text-xs">{t('Đang truy vấn thông tin nguồn gốc tài liệu...')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 p-3.5 text-xs text-coral dark:bg-coral/20">
            <p className="font-semibold">{error.message}</p>
          </div>
        )}

        {/* Provenance Details */}
        {!loading && provenance && (
          <div className="space-y-4">
            {/* Status & Origin Badge Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray">{t('Nguồn gốc:')}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    provenance.origin === 'IMPORTED'
                      ? 'bg-navy/15 text-navy dark:bg-blue/20 dark:text-blue'
                      : 'bg-gray/15 text-gray'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {provenance.origin === 'IMPORTED' ? 'upload_file' : 'edit'}
                  </span>
                  {provenance.origin === 'IMPORTED' ? t('Nhập từ tệp tài liệu') : t('Soạn thảo thủ công')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray">{t('Trạng thái đối chiếu:')}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    provenance.status === 'CURRENT'
                      ? 'bg-teal/15 text-teal border border-teal/40'
                      : provenance.status === 'STALE_SNAPSHOT'
                      ? 'bg-amber/15 text-amber border border-amber/40'
                      : 'bg-gray/10 text-gray'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {provenance.status === 'CURRENT'
                      ? 'verified'
                      : provenance.status === 'STALE_SNAPSHOT'
                      ? 'update'
                      : 'info'}
                  </span>
                  {provenance.status === 'CURRENT'
                    ? t('Bản ghi gốc hiện hành (CURRENT)')
                    : provenance.status === 'STALE_SNAPSHOT'
                    ? t('Đã sửa đổi sau khi nhập (STALE_SNAPSHOT)')
                    : t('Không áp dụng (NOT_APPLICABLE)')}
                </span>
              </div>
            </div>

            {/* MANUAL Origin Explanation */}
            {provenance.origin === 'MANUAL' && (
              <div className="rounded-xl border border-border bg-bg p-5 text-center text-xs text-gray space-y-1">
                <span className="material-symbols-outlined text-3xl text-gray/60 mb-1">history_edu</span>
                <p className="font-semibold text-text">{t('Phiên bản được soạn thảo trực tiếp trên hệ thống')}</p>
                <p className="max-w-md mx-auto">
                  {t('Hồ sơ nguồn này được tác giả nhập thủ công thông qua biểu mẫu của hệ thống, không qua tiến trình chuyển đổi tài liệu tự động.')}
                </p>
              </div>
            )}

            {/* IMPORTED Details */}
            {provenance.origin === 'IMPORTED' && provenance.document && (
              <>
                {/* Document Information Card */}
                <div className="rounded-xl border border-border bg-bg p-4 space-y-3 text-xs">
                  <h4 className="font-bold text-text flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span className="material-symbols-outlined text-base text-navy dark:text-blue">
                      description
                    </span>
                    {t('Tệp tài liệu gốc & Thông số trích xuất')}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-gray">{t('Tên tệp gốc:')}</span>{' '}
                      <span className="font-semibold text-text">{provenance.document.file.displayName}</span>
                    </div>
                    <div>
                      <span className="text-gray">{t('Dung lượng:')}</span>{' '}
                      <span className="font-semibold text-text">{formatBytes(provenance.document.file.bytes)}</span>
                    </div>
                    <div>
                      <span className="text-gray">{t('Trình trích xuất:')}</span>{' '}
                      <span className="font-semibold text-text">
                        {provenance.document.extraction.parser} ({provenance.document.extraction.parserVersion})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray">{t('Định chuẩn văn bản:')}</span>{' '}
                      <span className="font-mono text-[11px] text-text">
                        {provenance.document.extraction.normalization}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray">SHA-256 {t('tệp gốc:')}</span>{' '}
                      <span className="font-mono text-[11px] text-gray select-all break-all">
                        {provenance.document.file.sha256}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray">SHA-256 {t('văn bản trích xuất:')}</span>{' '}
                      <span className="font-mono text-[11px] text-gray select-all break-all">
                        {provenance.document.extraction.textSha256}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Snapshot Card */}
                {provenance.snapshot && (
                  <div className="rounded-xl border border-border bg-bg p-4 space-y-3 text-xs">
                    <h4 className="font-bold text-text flex items-center gap-1.5 border-b border-border/60 pb-2">
                      <span className="material-symbols-outlined text-base text-navy dark:text-blue">
                        camera
                      </span>
                      {t('Dữ liệu chụp tại thời điểm xác nhận (Snapshot)')}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-gray">{t('Thời điểm lưu:')}</span>{' '}
                        <span className="font-semibold text-text">{formatDate(provenance.snapshot.savedAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray">{t('Ký tự bị lược bỏ:')}</span>{' '}
                        <span className="font-semibold text-text">
                          {provenance.snapshot.omittedUtf16Units !== null
                            ? `${provenance.snapshot.omittedUtf16Units.toLocaleString()} ${t('ký tự')}`
                            : t('Không xác định')}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray">{t('Băm siêu dữ liệu (Metadata SHA-256):')}</span>{' '}
                        <span className="font-mono text-[11px] text-gray select-all break-all">
                          {provenance.snapshot.metadataSha256}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray">{t('Băm các mảnh (Chunks SHA-256):')}</span>{' '}
                        <span className="font-mono text-[11px] text-gray select-all break-all">
                          {provenance.snapshot.chunksSha256}
                        </span>
                      </div>
                    </div>

                    {/* Chunk Lineage Table */}
                    <div className="mt-3">
                      <h5 className="font-semibold text-text mb-2">
                        {t('Chi tiết dòng dõi các mảnh tri thức ({0} mảnh)', [provenance.snapshot.chunks.length])}
                      </h5>
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-card text-gray font-semibold border-b border-border">
                            <tr>
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">{t('Mã mảnh (Chunk ID)')}</th>
                              <th className="py-2 px-3">{t('Vị trí tài liệu (Locator)')}</th>
                              <th className="py-2 px-3">{t('Độ tin cậy')}</th>
                              <th className="py-2 px-3 text-right">{t('Đoạn trích')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {provenance.snapshot.chunks.map((ch: ChunkLineage, idx: number) => {
                              const statusCfg = LOCATOR_STATUS_CONFIG[ch.locatorStatus] || {
                                label: ch.locatorStatus,
                                badgeClass: 'bg-gray/10 text-gray',
                                icon: 'info',
                              };
                              return (
                                <tr key={ch.chunkId} className="hover:bg-card/50">
                                  <td className="py-2 px-3 font-bold text-gray">{idx + 1}</td>
                                  <td className="py-2 px-3 font-mono text-[11px] text-text" title={ch.chunkId}>
                                    {ch.chunkId.slice(0, 8)}...
                                  </td>
                                  <td className="py-2 px-3 text-text">
                                    {ch.locator || <span className="text-gray italic">{t('Chưa xác định')}</span>}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusCfg.badgeClass}`}
                                    >
                                      <span className="material-symbols-outlined text-[12px]">
                                        {statusCfg.icon}
                                      </span>
                                      {t(statusCfg.label)}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-gray">
                                    {ch.selectedSpans.length} {t('đoạn')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-bg px-4 py-2 text-xs font-semibold text-text hover:bg-border/40 transition-colors"
          >
            {t('Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
}
