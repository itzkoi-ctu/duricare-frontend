import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { AuthContext } from '../../contexts/authContextStore';
import type { CitationGroup } from '../../types/citation';

interface CitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CitationGroup[];
  initialGroupId?: string;
}

export default function CitationDetailModal({
  isOpen,
  onClose,
  groups,
  initialGroupId,
}: CitationDetailModalProps) {
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role;
  const canViewSourceProfile = userRole === 'ADMIN' || userRole === 'EXPERT';

  const [userSelectedId, setUserSelectedId] = useState<string | undefined>(undefined);

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

  // Determine active group: user explicit tab selection > initialGroupId > first group
  const activeGroupId =
    (userSelectedId && groups.some(g => g.id === userSelectedId) ? userSelectedId : undefined) ??
    (initialGroupId && groups.some(g => g.id === initialGroupId) ? initialGroupId : undefined) ??
    groups[0]?.id;

  const activeGroup = groups.find(g => g.id === activeGroupId) ?? groups[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4 text-text animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy dark:text-blue mb-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                menu_book
              </span>
              <span>{t('Chi tiết nguồn tham khảo')}</span>
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
              const isSelected = g.id === activeGroup.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setUserSelectedId(g.id)}
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

        {/* Meta badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {activeGroup.tier && (
            <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy dark:bg-blue/20 dark:text-blue">
              {t('Tầng {0}', [activeGroup.tier])}
            </span>
          )}
          <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-gray">
            {t('Phiên bản {0}', [activeGroup.revisionNumber])}
          </span>
          {activeGroup.year && (
            <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-gray">
              {t('Năm {0}', [activeGroup.year])}
            </span>
          )}
        </div>

        {/* Excerpts / Locators */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray">
            {t('Các đoạn trích được dùng ({0})', [activeGroup.chunks.length])}
          </h3>
          <ul className="space-y-1.5">
            {activeGroup.chunks.map((chunk, index) => (
              <li
                key={`${chunk.chunkId}:${index}`}
                className="rounded-lg border border-border bg-bg p-2.5 text-xs text-text space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text">
                    {t('Đoạn {0}', [index + 1])}
                  </span>
                  <span className="font-mono text-[10px] text-gray select-all">
                    {chunk.chunkId.slice(0, 8)}...
                  </span>
                </div>
                <p className="text-gray break-words">
                  <span className="font-medium text-text">{t('Vị trí / Mục')}:</span>{' '}
                  {chunk.locator}
                </p>
              </li>
            ))}
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
              <span>{t('Mở tài liệu gốc')}</span>
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
            <span>{t('Thông tin truy xuất')}</span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base group-open:rotate-180 transition-transform text-gray"
            >
              expand_more
            </span>
          </summary>
          <div className="mt-2 space-y-1.5 font-mono text-[11px] text-gray bg-bg p-3 rounded-lg border border-border select-all break-all">
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
              'Nguồn tri thức được truy xuất tự động từ cơ sở dữ liệu đã qua kiểm duyệt. Việc trích dẫn phản ánh cơ sở dữ liệu hiện hành, không đảm bảo tính đúng đắn tuyệt đối của toàn bộ câu trả lời.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
