/**
 * FE-KNOWLEDGE-IMPORT-001 ImportSessionsModal component
 * Lists own active unconfirmed preview sessions with expiry time, resume, and cancel actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-navy dark:text-blue text-2xl">
              pending_actions
            </span>
            <div>
              <h3 className="text-base font-bold text-text">{t('Phiên nhập tài liệu chờ xác nhận')}</h3>
              <p className="text-xs text-gray">
                {t('Danh sách các phiên trích xuất tài liệu tạm thời của bạn (tối đa lưu 30 phút).')}
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

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs text-coral dark:bg-coral/20">
            {error.message}
          </div>
        )}

        {/* List Content */}
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
          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {sessions.map(s => {
              const timeRem = formatTimeRemaining(s.expiresAt);
              const isActionRunning = actionLoadingId === s.id;
              const isTerminated = s.state === 'CANCELLED';

              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-bg p-3.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-gray/50 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-navy dark:text-blue text-lg shrink-0">
                        description
                      </span>
                      <p className="font-bold text-text truncate max-w-sm" title={s.file.displayName}>
                        {s.file.displayName}
                      </p>
                      {s.state === 'CONSUMED' && (
                        <span className="rounded-full bg-navy/15 text-navy dark:bg-blue/20 dark:text-blue px-2 py-0.5 text-[10px] font-bold">
                          {t('ĐÃ TẠO DRAFT (CONSUMED)')}
                        </span>
                      )}
                      {s.state === 'CANCELLED' && (
                        <span className="rounded-full bg-gray/15 text-gray px-2 py-0.5 text-[10px] font-bold">
                          {t('ĐÃ HỦY (CANCELLED)')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray">
                      <span>{t('Dung lượng:')} {formatBytes(s.file.bytes)}</span>
                      <span>•</span>
                      <span>{t('Tải lên:')} {formatDate(s.createdAt)}</span>
                      <span>•</span>
                      <span
                        className={`font-semibold ${
                          timeRem.isExpired ? 'text-coral' : 'text-amber'
                        }`}
                      >
                        {timeRem.isExpired ? t('Đã hết hạn') : `${t('Còn lại:')} ${timeRem.text}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResume(s)}
                      disabled={isActionRunning || (timeRem.isExpired && s.state !== 'CONSUMED') || isTerminated}
                      className="inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy/90 disabled:opacity-40 transition-all dark:bg-blue dark:text-bg"
                    >
                      {isActionRunning ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <span className="material-symbols-outlined text-sm">edit_document</span>
                      )}
                      {t('Tiếp tục')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      disabled={isActionRunning}
                      className="rounded-lg p-1.5 text-gray hover:text-coral hover:bg-coral/10 disabled:opacity-40 transition-colors"
                      title={t('Hủy bỏ phiên làm việc này')}
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-gray">
            <span>
              {t('Tổng số: {0} phiên (Trang {1} / {2})', [totalElements, page + 1, totalPages])}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchSessions(page - 1)}
                disabled={page === 0 || loading}
                className="rounded-lg p-1.5 hover:bg-border/40 disabled:opacity-30 transition-colors"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => fetchSessions(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="rounded-lg p-1.5 hover:bg-border/40 disabled:opacity-30 transition-colors"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-border pt-3">
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
