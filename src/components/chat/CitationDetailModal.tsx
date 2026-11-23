import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { t } from '../../i18n';
import { AuthContext } from '../../contexts/authContextStore';
import type { CitationChunk, CitationGroup } from '../../types/citation';
import { resolveCitationDetailEndpoint } from '../../utils/citationParser';

interface CitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CitationGroup[];
  initialGroupId?: string;
  conversationId?: string;
  messageId?: string;
}

interface LoadedPassage {
  content: string;
  locator: string;
  contentKind?: string;
}

export default function CitationDetailModal({
  isOpen,
  onClose,
  groups,
  initialGroupId,
  conversationId,
  messageId,
}: CitationDetailModalProps) {
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role;
  const canViewSourceProfile = userRole === 'ADMIN' || userRole === 'EXPERT';

  const [userSelectedId, setUserSelectedId] = useState<string | undefined>(undefined);
  const [loadedPassages, setLoadedPassages] = useState<Record<string, LoadedPassage>>({});
  const [passageLoading, setPassageLoading] = useState<Record<string, boolean>>({});
  const [passageError, setPassageError] = useState<Record<string, string>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Capture trigger element on open and restore on close
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
    } else if (triggerElementRef.current) {
      triggerElementRef.current.focus();
      triggerElementRef.current = null;
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setUserSelectedId(undefined);
    onClose();
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !groups || groups.length === 0) return null;

  const activeGroupId =
    (userSelectedId && groups.some(g => (g.citationId || g.id) === userSelectedId)
      ? userSelectedId
      : undefined) ??
    (initialGroupId && groups.some(g => (g.citationId || g.id) === initialGroupId)
      ? initialGroupId
      : undefined) ??
    (groups[0]?.citationId || groups[0]?.id);

  const activeGroup =
    groups.find(g => (g.citationId || g.id) === activeGroupId) ?? groups[0];

  // Origin Class Config: Deterministic mapping with neutral fallback (FE-RAG-ORIGIN-001)
  const getOriginClassConfig = (originClass?: string) => {
    if (originClass === 'EXPERT_AUTHORED') {
      return {
        label: t('Chuyên gia cung cấp'),
        icon: 'person',
        className: 'bg-navy/10 dark:bg-blue/20 text-navy dark:text-blue border-navy/20 dark:border-blue/30',
      };
    }
    if (originClass === 'EXTERNAL_REFERENCE') {
      return {
        label: t('Tài liệu tham khảo'),
        icon: 'menu_book',
        className: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      };
    }
    // UNDETERMINED, legacy, null, undefined, or any unsupported enum value: neutral gray, info icon
    return {
      label: t('Chưa xác định lớp nguồn'),
      icon: 'info',
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    };
  };

  const originConfig = getOriginClassConfig(activeGroup.originClass);

  // Author label: NAMED exposes publicAuthorName, WITHHELD uses contract microcopy, UNKNOWN/null uses "Chưa xác định tác giả"
  const authorLabel =
    activeGroup.authorState === 'NAMED' && activeGroup.publicAuthorName
      ? activeGroup.publicAuthorName
      : activeGroup.authorState === 'WITHHELD'
      ? t('Tên tác giả chưa được công bố')
      : t('Chưa xác định tác giả');

  // Origin status: REVIEWED or LEGACY_UNDETERMINED ("Dữ liệu kế thừa")
  const originStatusLabel =
    activeGroup.originStatus === 'REVIEWED'
      ? t('Xuất xứ đã duyệt')
      : activeGroup.originStatus === 'LEGACY_UNDETERMINED'
      ? t('Dữ liệu kế thừa')
      : null;

  const fetchPassage = async (chunk: CitationChunk) => {
    const chunkKey = `${activeGroup.citationId || activeGroup.id}:${chunk.chunkId}`;
    if (chunk.content) {
      setLoadedPassages(prev => ({
        ...prev,
        [chunkKey]: { content: chunk.content!, locator: chunk.locator },
      }));
      return;
    }

    // F3: Resolve message-scoped endpoint safely, stripping redundant /api prefix
    const endpoint = resolveCitationDetailEndpoint(chunk.detailPath, {
      conversationId,
      messageId,
      citationId: activeGroup.citationId || activeGroup.id,
      chunkId: chunk.chunkId,
    });

    if (!endpoint) {
      setPassageError(prev => ({
        ...prev,
        [chunkKey]: t('Không tìm thấy đường dẫn đoạn trích hợp lệ.'),
      }));
      return;
    }

    setPassageLoading(prev => ({ ...prev, [chunkKey]: true }));
    setPassageError(prev => {
      const next = { ...prev };
      delete next[chunkKey];
      return next;
    });

    try {
      const res = await client.get<LoadedPassage>(endpoint);
      setLoadedPassages(prev => ({ ...prev, [chunkKey]: res.data }));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { code?: string } } })?.response?.status;
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;

      if (status === 410 || code === 'source_no_longer_eligible') {
        setPassageError(prev => ({ ...prev, [chunkKey]: t('Nguồn không còn khả dụng trên hệ thống.') }));
      } else if (status === 404) {
        setPassageError(prev => ({ ...prev, [chunkKey]: t('Không tìm thấy nội dung đoạn trích.') }));
      } else if (status === 503) {
        setPassageError(prev => ({ ...prev, [chunkKey]: t('Kho lưu trữ đoạn trích tạm thời không phản hồi.') }));
      } else if (status === 403) {
        setPassageError(prev => ({ ...prev, [chunkKey]: t('Không có quyền truy cập đoạn trích này.') }));
      } else {
        setPassageError(prev => ({ ...prev, [chunkKey]: t('Không thể tải nội dung đoạn trích. Vui lòng thử lại.') }));
      }
    } finally {
      setPassageLoading(prev => ({ ...prev, [chunkKey]: false }));
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={modalRef}
        data-testid="citation-detail-modal"
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4 text-text animate-scaleUp pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy dark:text-blue mb-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                menu_book
              </span>
              <span>{t('Chi tiết nguồn tri thức')}</span>
            </div>
            <h2
              id="citation-modal-title"
              className="text-base sm:text-lg font-bold text-text break-words"
            >
              {activeGroup.sourceTitle}
            </h2>
          </div>
          <button
            type="button"
            data-testid="modal-close-btn"
            onClick={handleClose}
            aria-label={t('Đóng chi tiết nguồn')}
            className="shrink-0 p-1.5 rounded-lg border border-border text-gray hover:text-text hover:border-navy cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              close
            </span>
          </button>
        </div>

        {/* Source Switcher Tabs if multiple sources */}
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-2.5">
            {groups.map((g, idx) => {
              const gKey = g.citationId || g.id;
              const isSelected = gKey === (activeGroup.citationId || activeGroup.id);
              return (
                <button
                  key={gKey}
                  type="button"
                  onClick={() => setUserSelectedId(gKey)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 min-h-[30px] rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-navy text-surface dark:bg-blue dark:text-bg font-semibold'
                      : 'border border-border bg-bg text-gray hover:text-text'
                  }`}
                >
                  <span>{idx + 1}.</span>
                  <span className="max-w-[120px] sm:max-w-[160px] truncate text-left">
                    {g.sourceTitle}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Origin & Provenance Badges Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Origin class badge */}
          <span
            data-testid="citation-origin-badge"
            className={`inline-flex items-center gap-1.5 min-h-[24px] rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none ${originConfig.className}`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[14px] shrink-0 leading-none">
              {originConfig.icon}
            </span>
            <span className="break-words">{originConfig.label}</span>
          </span>

          {/* Author badge */}
          <span
            data-testid="citation-author-badge"
            className="inline-flex items-center gap-1 min-h-[24px] rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text font-medium leading-none"
          >
            <span className="text-gray">{t('Tác giả')}:</span>
            <span className="break-words font-medium">{authorLabel}</span>
          </span>

          {/* Origin status (Reviewed / Legacy) badge */}
          {originStatusLabel && (
            <span
              data-testid="citation-status-badge"
              className={`inline-flex items-center min-h-[24px] rounded-full px-2.5 py-0.5 text-xs font-medium border leading-none ${
                activeGroup.originStatus === 'REVIEWED'
                  ? 'bg-navy/5 text-navy dark:bg-blue/10 dark:text-blue border-navy/20 dark:border-blue/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-border'
              }`}
            >
              {originStatusLabel}
            </span>
          )}

          {/* Tier badge */}
          {activeGroup.tier && (
            <span
              data-testid="citation-tier-badge"
              className="inline-flex items-center min-h-[24px] rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy dark:bg-blue/20 dark:text-blue border border-navy/20 dark:border-blue/30 leading-none"
            >
              {t('Tầng {0}', [activeGroup.tier])}
            </span>
          )}

          {/* Revision badge */}
          <span
            data-testid="citation-revision-badge"
            className="inline-flex items-center min-h-[24px] rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs font-medium text-gray leading-none"
          >
            {t('Phiên bản {0}', [activeGroup.revisionNumber ?? 1])}
          </span>

          {/* Year badge */}
          {activeGroup.year && (
            <span
              data-testid="citation-year-badge"
              className="inline-flex items-center min-h-[24px] rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs font-medium text-gray leading-none"
            >
              {t('Năm {0}', [activeGroup.year])}
            </span>
          )}
        </div>

        {/* Excerpts / Locators */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray">
            {t('Các đoạn trích đã cung cấp cho AI ({0})', [activeGroup.chunks.length])}
          </h3>
          <ul className="space-y-2">
            {activeGroup.chunks.map((chunk, index) => {
              const chunkKey = `${activeGroup.citationId || activeGroup.id}:${chunk.chunkId}`;
              const passage = loadedPassages[chunkKey] || (chunk.content ? { content: chunk.content, locator: chunk.locator } : null);
              const isLoadingThis = passageLoading[chunkKey];
              const errorThis = passageError[chunkKey];

              return (
                <li
                  key={`${chunk.chunkId}:${index}`}
                  className="rounded-xl border border-border bg-bg p-3 text-xs text-text space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text">
                      {t('Đoạn trích {0}', [index + 1])}
                    </span>
                    <span className="font-mono text-[10px] text-gray select-all">
                      {chunk.chunkId.slice(0, 8)}...
                    </span>
                  </div>

                  <p className="text-gray break-words">
                    <span className="font-medium text-text">{t('Vị trí / Mục')}:</span>{' '}
                    {chunk.locator}
                  </p>

                  {/* Passage Content or Load Action */}
                  {passage ? (
                    <div className="mt-2 p-2.5 rounded-lg bg-surface border border-border/80 text-text space-y-1">
                      <div className="text-[11px] font-semibold text-gray flex items-center justify-between">
                        <span>{t('Nội dung đã duyệt')}:</span>
                        {chunk.contentHash && (
                          <span className="font-mono text-[10px] text-slate-400 select-all">
                            SHA: {chunk.contentHash.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <p data-testid="citation-passage-content" className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                        {passage.content}
                      </p>
                    </div>
                  ) : errorThis ? (
                    <div data-testid="passage-error-card" className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                      <span>{errorThis}</span>
                      <button
                        type="button"
                        data-testid="btn-retry-passage"
                        onClick={() => fetchPassage(chunk)}
                        className="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-800 font-semibold cursor-pointer shrink-0"
                      >
                        {t('Thử lại')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="btn-fetch-passage"
                      disabled={isLoadingThis}
                      onClick={() => fetchPassage(chunk)}
                      className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-surface hover:border-navy hover:text-navy text-gray transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">read_more</span>
                      <span>{isLoadingThis ? t('Đang tải nội dung...') : t('Xem nội dung đoạn trích')}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Actions row: Source profile (if authorized) + Original document link (if valid URL) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {activeGroup.sourceUrl && (
            <a
              href={activeGroup.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[36px] rounded-xl bg-navy/10 hover:bg-navy/20 dark:bg-blue/20 dark:hover:bg-blue/30 text-navy dark:text-blue px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                open_in_new
              </span>
              <span>{t('Mở tài liệu nguồn')}</span>
            </a>
          )}

          {canViewSourceProfile && (
            <Link
              to={`/knowledge/sources/${activeGroup.sourceId}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 min-h-[36px] rounded-xl border border-border bg-surface hover:border-navy hover:text-navy dark:hover:border-blue dark:hover:text-blue px-3 py-1.5 text-xs font-semibold text-text transition-colors cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                visibility
              </span>
              <span>{t('Xem hồ sơ nguồn')}</span>
            </Link>
          )}
        </div>

        {/* Collapsible Audit / Provenance Information */}
        <details className="group border-t border-border pt-3">
          <summary className="flex items-center justify-between text-xs font-semibold text-gray cursor-pointer select-none">
            <span>{t('Thông tin kiểm tra')}</span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base group-open:rotate-180 transition-transform text-gray"
            >
              expand_more
            </span>
          </summary>
          <div className="mt-2 space-y-1.5 font-mono text-[11px] text-gray bg-bg p-3 rounded-lg border border-border select-all break-all">
            {activeGroup.citationId && (
              <div>
                <span className="font-semibold text-text">{t('Mã trích dẫn')}:</span>{' '}
                {activeGroup.citationId}
              </div>
            )}
            <div>
              <span className="font-semibold text-text">{t('Mã xuất bản')}:</span>{' '}
              {activeGroup.publicationId}
            </div>
            <div>
              <span className="font-semibold text-text">{t('Mã nguồn')}:</span>{' '}
              {activeGroup.sourceId}
            </div>
            <div>
              <span className="font-semibold text-text">{t('Mã phiên bản')}:</span>{' '}
              {activeGroup.revisionId}
            </div>
            <div className="pt-1 border-t border-border/50">
              <span className="font-semibold text-text">{t('Mã các đoạn trích')}:</span>
              <ul className="mt-1 space-y-1">
                {activeGroup.chunks.map((c, i) => (
                  <li key={c.chunkId} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray">[{i + 1}]</span>
                    <span>{c.chunkId}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        {/* Legal / Scientific Accuracy Disclaimer */}
        <div className="border-t border-border pt-3">
          <p className="text-[11px] leading-relaxed text-gray italic">
            {t(
              'Các nguồn tri thức được cung cấp cho mô hình AI trong ngữ cảnh đã duyệt. Trích dẫn thể hiện cơ sở tri thức hiện hành, không đảm bảo tính đúng đắn tuyệt đối của toàn bộ câu trả lời.',
            )}
          </p>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
