/**
 * FE-KNOWLEDGE-IMPORT-001 ExtractedTextPanel component
 * Safe display of raw extracted plain text, warnings, segment locators, and counters per Stitch design
 */

import { useState } from 'react';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type { Extraction, FileInfo, Segment, WarningCode } from '../../../types/import';
import { WARNING_CONFIG } from '../../../utils/importUtils';

interface ExtractedTextPanelProps {
  file: FileInfo;
  extraction: Extraction | null;
}

export default function ExtractedTextPanel({ file, extraction }: ExtractedTextPanelProps) {
  useLanguage();
  const [viewMode, setViewMode] = useState<'text' | 'segments'>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!extraction) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-gray">
        <span className="material-symbols-outlined text-3xl mb-2 text-gray/60">description</span>
        <p className="text-sm">{t('Không có dữ liệu trích xuất văn bản cho phiên làm việc này.')}</p>
      </div>
    );
  }

  const { counters, warnings, segments, text } = extraction;

  const filteredSegments = searchQuery.trim()
    ? segments.filter((seg: Segment) => {
        const segText = text.slice(seg.start, seg.end);
        return (
          segText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seg.locator.display.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : segments;

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  return (
    <div
      data-testid="extracted-text-panel"
      className="bg-surface rounded-xl border border-border shadow-xs flex flex-col h-[780px] max-h-[85vh] overflow-hidden"
    >
      {/* Header with Title & View Tabs */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0" title={file.displayName}>
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
              description
            </span>
            <h2 className="text-sm md:text-base font-semibold text-text truncate">
              {t('Văn bản trích xuất')}
            </h2>
          </div>

          {/* View Tabs */}
          <div className="flex p-0.5 bg-surface-hover rounded-lg text-xs font-medium shrink-0 border border-border/60">
            <button
              type="button"
              data-testid="tab-view-text"
              onClick={() => setViewMode('text')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'text'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-gray hover:text-text'
              }`}
            >
              {t('Toàn văn')}
            </button>
            <button
              type="button"
              data-testid="tab-view-segments"
              onClick={() => setViewMode('segments')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'segments'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-gray hover:text-text'
              }`}
            >
              {t('Phân đoạn')} ({counters.segments})
            </button>
          </div>
        </div>

        {/* Search Input Field */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2 text-gray text-[18px]">
            search
          </span>
          <input
            type="text"
            data-testid="extraction-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === 'segments'
                ? t('Tìm trong phân đoạn...')
                : t('Tìm trong nội dung văn bản...')
            }
            className="w-full h-9 pl-9 pr-3 text-xs bg-surface-hover/50 border border-border rounded-lg text-text placeholder:text-gray focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        {/* Warnings Banner (Reading Order / Text layer alert) */}
        {warnings.length > 0 && (
          <div
            data-testid="extraction-warning-banner"
            className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-600 shrink-0 mt-0.5">
              warning
            </span>
            <div className="flex-1 leading-snug">
              <div className="font-semibold text-amber-950 dark:text-amber-100 flex items-center justify-between">
                <span>{t('Cảnh báo cấu trúc tài liệu ({0})', [warnings.length])}</span>
              </div>
              <div className="mt-1 space-y-1">
                {warnings.map((code: WarningCode, idx: number) => {
                  const cfg = WARNING_CONFIG[code] || {
                    label: code,
                    description: 'Cần rà soát tính hợp lệ của phân đoạn này.',
                    severity: 'warning',
                  };
                  return (
                    <p key={idx} className="text-[11px] text-amber-800 dark:text-amber-300">
                      • <strong className="font-semibold">{t(cfg.label)}:</strong> {t(cfg.description)}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto text-xs leading-relaxed text-text font-mono space-y-3 bg-surface-hover/20 select-text">
        {viewMode === 'text' ? (
          <div data-testid="raw-text-content" className="whitespace-pre-wrap break-words leading-relaxed">
            {text}
          </div>
        ) : (
          <div data-testid="segments-list" className="space-y-2">
            {filteredSegments.length === 0 ? (
              <p className="text-center text-gray py-6 italic">
                {t('Không tìm thấy phân đoạn phù hợp với từ khóa.')}
              </p>
            ) : (
              filteredSegments.map((seg: Segment) => {
                const segText = text.slice(seg.start, seg.end);
                return (
                  <div
                    key={seg.id}
                    data-testid={`segment-item-${seg.id}`}
                    className="p-3 bg-surface rounded-lg border border-border space-y-1.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <span className="material-symbols-outlined text-[14px]">bookmark</span>
                        <span>{t('Đoạn')} #{seg.id}</span>
                        <span className="text-[10px] text-gray font-normal">({seg.start}..{seg.end})</span>
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-text border border-border/60">
                        {seg.locator.display}
                      </span>
                    </div>
                    <p className="text-[11px] text-text/90 line-clamp-3 bg-surface-hover/40 p-2 rounded border border-border/40 font-mono">
                      {segText}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-border flex items-center justify-between text-xs text-gray bg-surface shrink-0">
        <span className="tabular-nums">
          {t('Đang hiển thị {0} ký tự trích xuất', [counters.utf16Units.toLocaleString()])}
        </span>
        <button
          type="button"
          data-testid="copy-extracted-text-button"
          onClick={handleCopyAll}
          className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? t('Đã sao chép!') : t('Sao chép toàn bộ')}</span>
        </button>
      </div>
    </div>
  );
}
