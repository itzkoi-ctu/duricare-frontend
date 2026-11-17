/**
 * FE-KNOWLEDGE-IMPORT-001 ImportSessionsModal component
 * Lists own active unconfirmed preview sessions with expiry time, resume, and cancel actions
 * Aligned with Stitch references sessions-desktop.html & sessions-mobile.html
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type { SessionSummary, PreviewSession } from '../../../types/import';
import {
  listImportPreviews,
  getImportPreview,
  deleteImportPreview,
  parseImportError,
  type ParsedImportError,
} from '../../../api/import';
import { formatBytes, formatDate, formatTimeRemaining } from '../../../utils/importUtils';

interface ImportSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSession: (session: PreviewSession) => void;
}

export default function ImportSessionsModal({
  isOpen,
  onClose,
  onResumeSession,
}: ImportSessionsModalProps) {
  useLanguage();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<ParsedImportError | null>(null);

  const resumeGenerationRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const fetchSessions = useCallback(async (targetPage = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listImportPreviews(targetPage, 10);
      setSessions(data.content);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: unknown) {
      setError(parseImportError(err, t('Không thể tải danh sách phiên nhập tài liệu.')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions(0);
    }
    return () => {
      resumeGenerationRef.current++;
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [isOpen, fetchSessions]);

  if (!isOpen) return null;

  const handleResume = async (session: SessionSummary) => {
    if (session.state === 'CANCELLED') return;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const currentGen = ++resumeGenerationRef.current;

    setActionLoadingId(session.id);
    setError(null);
    try {
      const detail = await getImportPreview(session.id);
      // Generation fence: discard late response if another session was requested
      if (resumeGenerationRef.current !== currentGen) {
        return;
      }
      setActionLoadingId(null);
      onResumeSession(detail);
      onClose();
    } catch (err: unknown) {
      if (resumeGenerationRef.current !== currentGen) {
        return;
      }
      setActionLoadingId(null);
      setError(parseImportError(err, t('Không thể tải chi tiết phiên làm việc này. Có thể phiên đã hết hạn.')));
    }
  };

  const handleDelete = async (session: SessionSummary) => {
    if (!confirm(t('Bạn có chắc chắn muốn hủy phiên làm việc cho tệp "{0}"?', [session.file.displayName]))) {
      return;
    }
    setActionLoadingId(session.id);
    setError(null);
    try {
      await deleteImportPreview(session.id, session.version);
      setActionLoadingId(null);
      // Refresh list
      fetchSessions(page);
    } catch (err: unknown) {
      setActionLoadingId(null);
      setError(parseImportError(err, t('Không thể hủy phiên làm việc.')));
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog: max-w-[760px] */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sessions-modal-title"
        className="w-full max-w-[760px] bg-surface rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp text-left"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-surface shrink-0">
          <div>
            <h2 id="sessions-modal-title" className="text-lg sm:text-[20px] font-semibold text-text tracking-tight">
              {t('Phiên nhập của tôi')}
            </h2>
            <p className="text-xs text-gray mt-1">
              {t('Các phiên xem trước của chính bạn; thời hạn theo từng phiên.')}
            </p>
          </div>
          {/* 44x44px Hit Target Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Đóng modal')}
            title={t('Đóng modal')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-gray hover:text-text hover:bg-border/30 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* MODAL BODY (Scrollable content) */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto bg-surface flex-1">
          {/* Informational Note Box */}
          <div className="bg-bg border border-border rounded-lg p-3 text-[13px] leading-[18px] text-gray flex items-start gap-2.5 shrink-0">
            <span className="material-symbols-outlined text-gray shrink-0 text-lg mt-0.5">info</span>
            <span>
              {t('Phiên lưu văn bản trích xuất tạm thời; các chỉnh sửa chưa xác nhận trong trình duyệt không được bảo đảm khôi phục.')}
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs text-coral dark:bg-coral/20">
              {error.message}
            </div>
          )}

          {/* LIST OF SESSION ENTRIES */}
          {loading ? (
            <div className="py-12 text-center text-gray">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent dark:border-blue dark:border-t-transparent" />
              <p className="mt-2 text-xs">{t('Đang tải danh sách phiên làm việc...')}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center text-gray">
              <span className="material-symbols-outlined text-3xl mb-1 text-gray/50">folder_open</span>
              <p className="text-sm font-semibold text-text">{t('Không có phiên nhập nào đang chờ xác nhận')}</p>
              <p className="mt-1 text-xs">{t('Khi bạn tải tài liệu lên, phiên xem trước sẽ được lưu tạm tại đây.')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map(s => {
                const timeRem = formatTimeRemaining(s.expiresAt);
                const isActionRunning = actionLoadingId === s.id;
                const isPdf = s.file.displayName.toLowerCase().endsWith('.pdf');
                const isExpired = timeRem.isExpired && s.state === 'READY';
                const isReadyActive = s.state === 'READY' && !timeRem.isExpired;

                return (
                  <div
                    key={s.id}
                    className="border border-border rounded-xl p-4 bg-surface flex flex-col gap-3 shadow-xs hover:border-gray/40 transition-all"
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                            isPdf
                              ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:border-red-800'
                              : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/30 dark:border-sky-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl">
                            {isPdf ? 'picture_as_pdf' : 'description'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-text leading-tight truncate max-w-xs sm:max-w-md" title={s.file.displayName}>
                            {s.file.displayName}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray">
                            <span className="font-mono">{formatBytes(s.file.bytes)}</span>
                            <span className="text-gray/40">•</span>
                            <span>{t('Tạo lúc')} {formatDate(s.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges: Height 24px, rounded-[6px], text-12px, font-medium */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {isReadyActive && (
                          <>
                            <div className="h-6 px-2.5 rounded-[6px] bg-amber/15 text-amber border border-amber/30 text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              <span>{t('Còn')} {timeRem.text}</span>
                            </div>
                            <div className="h-6 px-2.5 rounded-[6px] bg-blue/10 text-navy dark:text-blue border border-blue/30 text-xs font-medium flex items-center whitespace-nowrap">
                              <span>{t('Chờ tạo bản nháp')}</span>
                            </div>
                          </>
                        )}
                        {isExpired && (
                          <div className="h-6 px-2.5 rounded-[6px] bg-border/40 text-gray border border-border text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                            <span className="material-symbols-outlined text-xs">history_toggle_off</span>
                            <span>{t('Đã hết hạn')}</span>
                          </div>
                        )}
                        {s.state === 'CONSUMED' && (
                          <div className="h-6 px-2.5 rounded-[6px] bg-forest/15 text-forest border border-forest/30 text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            <span>{t('Đã tạo bản nháp')}</span>
                          </div>
                        )}
                        {s.state === 'CANCELLED' && (
                          <div className="h-6 px-2.5 rounded-[6px] bg-border/40 text-gray border border-border text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                            <span className="material-symbols-outlined text-xs">cancel</span>
                            <span>{t('Đã hủy')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Informational Subtext for non-ready states */}
                    {s.state === 'CONSUMED' && (
                      <div className="text-xs text-text bg-bg px-3 py-2 rounded-lg border border-border flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-forest">task_alt</span>
                        <span>{t('Bản nháp đã được khởi tạo thành công từ phiên này.')}</span>
                      </div>
                    )}
                    {isExpired && (
                      <div className="text-[13px] text-gray italic pl-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-gray not-italic">timer_off</span>
                        <span>{t('Phiên xem trước đã hết thời hạn lưu trữ tạm thời trên máy chủ.')}</span>
                      </div>
                    )}

                    {/* Middle Row / Details Disclosure */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 text-xs text-gray hover:text-text font-medium py-1 cursor-pointer select-none">
                        <span className="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">
                          expand_more
                        </span>
                        <span>{t('Chi tiết kỹ thuật')}</span>
                      </summary>
                      <div className="mt-1.5 p-2.5 rounded-lg bg-bg text-[11px] font-mono text-gray space-y-0.5 border border-border">
                        <div className="flex justify-between">
                          <span>{t('Mã phiên:')}</span>
                          <span className="font-semibold text-text">{s.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('Phiên bản:')}</span>
                          <span className="font-semibold text-text">v{s.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('Loại tệp:')}</span>
                          <span className="font-semibold text-text">{s.file.mediaType}</span>
                        </div>
                      </div>
                    </details>

                    {/* Action Row */}
                    <div className="flex justify-end items-center gap-3 pt-3 border-t border-border/60">
                      {isReadyActive && (
                        <>
                          {/* Red outline button 44px */}
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            disabled={isActionRunning}
                            className="h-11 min-h-[44px] px-4 rounded-lg border border-coral/40 text-coral bg-coral/5 hover:bg-coral/15 font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-base">delete_outline</span>
                            <span>{t('Hủy phiên')}</span>
                          </button>
                          {/* Primary CTU blue button 44px */}
                          <button
                            type="button"
                            onClick={() => handleResume(s)}
                            disabled={isActionRunning}
                            className="h-11 min-h-[44px] px-5 rounded-lg bg-navy hover:bg-navy/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm transition-colors dark:bg-blue dark:text-bg dark:hover:bg-blue/90 disabled:opacity-40"
                          >
                            {isActionRunning ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <>
                                <span>{t('Tiếp tục')}</span>
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {s.state === 'CONSUMED' && (
                        <button
                          type="button"
                          onClick={() => handleResume(s)}
                          disabled={isActionRunning}
                          className="h-11 min-h-[44px] px-5 rounded-lg bg-navy hover:bg-navy/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm transition-colors dark:bg-blue dark:text-bg dark:hover:bg-blue/90 disabled:opacity-40"
                        >
                          {isActionRunning ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-base">folder_open</span>
                              <span>{t('Mở hồ sơ')}</span>
                            </>
                          )}
                        </button>
                      )}

                      {(isExpired || s.state === 'CANCELLED') && (
                        <button
                          type="button"
                          disabled
                          className="h-11 min-h-[44px] px-5 rounded-lg bg-border/40 text-gray cursor-not-allowed border border-border font-medium text-sm flex items-center gap-1.5 opacity-50"
                        >
                          <span>{t('Tiếp tục')}</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER (44px controls, clear separation) */}
        <div className="p-4 px-6 bg-surface border-t border-border flex justify-between items-center shrink-0 flex-wrap gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Pagination Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-gray text-xs font-medium">
              <span className="text-text font-semibold">{t('Trang {0}', [page + 1])}</span>
              <span className="text-gray/40">/</span>
              <span>{totalPages}</span>
            </div>
            <span className="text-gray/30">|</span>
            <span className="text-xs text-gray font-medium">
              {t('Tổng số: {0} phiên', [totalElements])}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {/* Previous Button (44px hit target) */}
              <button
                type="button"
                onClick={() => fetchSessions(page - 1)}
                disabled={page === 0 || loading}
                title={t('Trang trước')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-border bg-surface text-text hover:bg-surface-hover flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              {/* Next Button (44px hit target) */}
              <button
                type="button"
                onClick={() => fetchSessions(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                title={t('Trang kế')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-border bg-surface text-text hover:bg-surface-hover flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Modal Dismissal Action */}
          <div>
            <button
              type="button"
              onClick={onClose}
              className="h-11 min-h-[44px] px-6 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-medium text-sm transition-colors shadow-xs"
            >
              {t('Đóng')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
