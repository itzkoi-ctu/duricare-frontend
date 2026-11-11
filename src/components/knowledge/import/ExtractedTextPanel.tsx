/**
 * FE-KNOWLEDGE-IMPORT-001 ExtractedTextPanel component
 * Safe display of raw extracted plain text, warnings, segment locators, and counters
 */

import { useState } from 'react';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type { Extraction, FileInfo, Segment, WarningCode } from '../../../types/import';
import { formatBytes, WARNING_CONFIG } from '../../../utils/importUtils';

interface ExtractedTextPanelProps {
  file: FileInfo;
  extraction: Extraction | null;
}

export default function ExtractedTextPanel({ file, extraction }: ExtractedTextPanelProps) {
  useLanguage();
  const [viewMode, setViewMode] = useState<'text' | 'segments'>('text');
  const [searchQuery, setSearchQuery] = useState('');

  if (!extraction) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-gray">
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

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* File & Parser Summary Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-navy dark:text-blue">article</span>
            <h3 className="text-base font-bold text-text truncate max-w-md" title={file.displayName}>
              {file.displayName}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray">
            <span>{t('Dung lượng:')} {formatBytes(file.bytes)}</span>
            <span>•</span>
            <span>{t('Trình xử lý:')} {extraction.parser} ({extraction.parserVersion})</span>
            <span>•</span>
            <span className="font-mono text-[11px]" title={`SHA-256: ${file.sha256}`}>
              SHA: {file.sha256.slice(0, 10)}...
            </span>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-bg p-1 border border-border shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('text')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'text'
                ? 'bg-card text-text shadow-sm'
                : 'text-gray hover:text-text'
            }`}
          >
            {t('Toàn văn')} ({counters.utf16Units.toLocaleString()} {t('ký tự')})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('segments')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'segments'
                ? 'bg-card text-text shadow-sm'
                : 'text-gray hover:text-text'
            }`}
          >
            {t('Phân đoạn')} ({counters.segments})
          </button>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
        <div className="rounded-xl border border-border/80 bg-bg p-2.5">
          <span className="text-gray block">{t('Ký tự trích xuất')}</span>
          <span className="font-bold text-text mt-0.5 block">
            {counters.utf16Units.toLocaleString()} / 120.000
          </span>
        </div>
        <div className="rounded-xl border border-border/80 bg-bg p-2.5">
          <span className="text-gray block">{t('Số phân đoạn')}</span>
          <span className="font-bold text-text mt-0.5 block">{counters.segments} {t('đoạn')}</span>
        </div>
        {counters.pages !== null ? (
          <div className="rounded-xl border border-border/80 bg-bg p-2.5">
            <span className="text-gray block">{t('Số trang PDF')}</span>
            <span className="font-bold text-text mt-0.5 block">{counters.pages} {t('trang')}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 bg-bg p-2.5">
            <span className="text-gray block">{t('Số đoạn văn (Paragraphs)')}</span>
            <span className="font-bold text-text mt-0.5 block">{counters.paragraphs}</span>
          </div>
        )}
        <div className="rounded-xl border border-border/80 bg-bg p-2.5">
          <span className="text-gray block">{t('Kích thước UTF-8')}</span>
          <span className="font-bold text-text mt-0.5 block">{formatBytes(counters.utf8Bytes)}</span>
        </div>
      </div>

      {/* Warnings List */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber/30 bg-amber/10 p-3.5 space-y-2 dark:bg-amber/20">
          <div className="flex items-center gap-2 text-xs font-bold text-amber">
            <span className="material-symbols-outlined text-base">warning</span>
            <span>{t('Cảnh báo cấu trúc tài liệu ({0})', [warnings.length])}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {warnings.map((code: WarningCode, idx: number) => {
              const cfg = WARNING_CONFIG[code] || {
                label: code,
                description: 'Cần rà soát tính hợp lệ của phân đoạn này.',
                severity: 'warning',
              };
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border/80 bg-bg/80 p-2.5 text-xs space-y-0.5"
                >
                  <p className="font-semibold text-text flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                    {t(cfg.label)}
                  </p>
                  <p className="text-gray leading-relaxed text-[11px]">{t(cfg.description)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'text' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray">
            <span>{t('Nội dung văn bản định chuẩn an toàn (DURI-IMPORT-TEXT-1):')}</span>
            <span className="font-mono text-[11px]">{t('Độ dài: {0} ký tự UTF-16', [text.length])}</span>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-text select-text whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Tìm kiếm phân đoạn hoặc vị trí...')}
                className="w-full rounded-xl border border-border bg-bg pl-9 pr-3.5 py-2 text-xs text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40"
              />
            </div>
            <span className="text-xs text-gray shrink-0">
              {t('{0} / {1} đoạn', [filteredSegments.length, segments.length])}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredSegments.map((seg: Segment) => {
              const segText = text.slice(seg.start, seg.end);
              return (
                <div
                  key={seg.id}
                  className="rounded-xl border border-border bg-bg p-3 text-xs space-y-1.5 hover:border-gray/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 font-semibold text-navy dark:text-blue">
                      <span className="material-symbols-outlined text-sm">bookmark</span>
                      {t('Đoạn')} #{seg.id} ({seg.start}..{seg.end})
                    </span>
                    <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium text-gray text-[11px]">
                      {seg.locator.display}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-text whitespace-pre-wrap leading-relaxed line-clamp-3 bg-card/60 p-2 rounded-lg border border-border/60">
                    {segText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
