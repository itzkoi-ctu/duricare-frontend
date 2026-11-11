/**
 * FE-KNOWLEDGE-IMPORT-001 ImportChunkEditor component
 * Document metadata form, chunk list manager (1..20 chunks), locator assurance & downgrade logic, review confirmation
 */

import { useState } from 'react';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type {
  GrowthStage,
  KnowledgeMetadata,
  SourceType,
  Topic,
} from '../../../types/governance';
import type {
  ChunkInput,
  LocatorStatus,
  Span,
  ProposedChunk,
  MetadataSuggestion,
  Extraction,
} from '../../../types/import';
import {
  generateUUID,
  LOCATOR_STATUS_CONFIG,
} from '../../../utils/importUtils';
import {
  SOURCE_TYPE_CONFIG,
  TOPIC_CONFIG,
  GROWTH_STAGE_CONFIG,
} from '../../../utils/governanceStatus';

export interface ChunkEditorState {
  chunk: ChunkInput;
  selectedSpans: Span[];
  locatorStatus: LocatorStatus;
}

interface ImportChunkEditorProps {
  metadata: KnowledgeMetadata;
  onMetadataChange: (meta: KnowledgeMetadata) => void;
  chunks: ChunkEditorState[];
  onChunksChange: (updater: (prev: ChunkEditorState[]) => ChunkEditorState[]) => void;
  extraction: Extraction | null;
  metadataSuggestion: MetadataSuggestion | null;
  reviewConfirmed: boolean;
  onReviewConfirmedChange: (confirmed: boolean) => void;
  onProceedToConfirm: () => void;
  fieldErrors: Record<string, string>;
  disabled?: boolean;
}

const inputStyle =
  'min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';
const textareaStyle =
  'w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 resize-y';
const labelStyle = 'mb-1 block text-xs font-semibold text-text';

export function initializeChunksFromProposals(
  proposals: ProposedChunk[],
  _extraction: Extraction | null
): ChunkEditorState[] {
  if (proposals.length > 0) {
    return proposals.slice(0, 20).map((prop, idx) => ({
      chunk: {
        clientChunkKey: generateUUID(),
        title: prop.title || `${t('Mảnh tri thức')} #${idx + 1}`,
        topic: prop.topic || (null as unknown as Topic),
        stage: prop.stage || null,
        content: prop.content || '',
        originalExcerpt: prop.originalExcerpt || null,
        locator: prop.locator || null,
        applicabilityNotes: null,
        measurementNotes: null,
      },
      selectedSpans: prop.selectedSpans || [],
      locatorStatus: 'EXACT_SPAN',
    }));
  }

  // Fallback: If MANUAL_REQUIRED or proposals empty, initialize with 1 manual chunk with empty content
  // User authors chunks manually without arbitrary slicing or severed surrogate pairs
  return [
    {
      chunk: {
        clientChunkKey: generateUUID(),
        title: `${t('Mảnh tri thức')} #1`,
        topic: null as unknown as Topic,
        stage: null,
        content: '',
        originalExcerpt: '',
        locator: null,
        applicabilityNotes: null,
        measurementNotes: null,
      },
      selectedSpans: [],
      locatorStatus: 'UNVERIFIED',
    },
  ];
}

export default function ImportChunkEditor({
  metadata,
  onMetadataChange,
  chunks,
  onChunksChange,
  reviewConfirmed,
  onReviewConfirmedChange,
  onProceedToConfirm,
  fieldErrors,
  disabled = false,
}: ImportChunkEditorProps) {
  useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleMetadataField = <K extends keyof KnowledgeMetadata>(field: K, value: KnowledgeMetadata[K]) => {
    onMetadataChange({
      ...metadata,
      [field]: value,
    });
  };

  const updateChunk = (index: number, chunkPatch: Partial<ChunkInput>, locatorStatusPatch?: LocatorStatus) => {
    onChunksChange(prev => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;

      // Downgrade logic: If content, excerpt, or locator is modified and current status was EXACT_SPAN,
      // downgrade to UNVERIFIED unless an explicit status was provided.
      let newStatus = locatorStatusPatch !== undefined ? locatorStatusPatch : current.locatorStatus;
      const isContentModified =
        (chunkPatch.content !== undefined && chunkPatch.content !== current.chunk.content) ||
        (chunkPatch.originalExcerpt !== undefined && chunkPatch.originalExcerpt !== current.chunk.originalExcerpt) ||
        (chunkPatch.locator !== undefined && chunkPatch.locator !== current.chunk.locator);

      if (isContentModified && current.locatorStatus === 'EXACT_SPAN' && locatorStatusPatch === undefined) {
        newStatus = 'UNVERIFIED';
      }

      next[index] = {
        ...current,
        chunk: {
          ...current.chunk,
          ...chunkPatch,
        },
        locatorStatus: newStatus,
      };
      return next;
    });
  };

  const handleAddChunk = () => {
    if (chunks.length >= 20 || disabled) return;
    const newEntry: ChunkEditorState = {
      chunk: {
        clientChunkKey: generateUUID(),
        title: `Mảnh tri thức #${chunks.length + 1}`,
        topic: 'GENERAL',
        stage: null,
        content: '',
        originalExcerpt: null,
        locator: null,
        applicabilityNotes: null,
        measurementNotes: null,
      },
      selectedSpans: [],
      locatorStatus: 'UNVERIFIED',
    };
    onChunksChange(prev => [...prev, newEntry]);
    setExpandedIndex(chunks.length);
  };

  const handleRemoveChunk = (index: number) => {
    if (chunks.length <= 1 || disabled) return;
    onChunksChange(prev => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(Math.max(0, index - 1));
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || disabled) return;
    onChunksChange(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
    setExpandedIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === chunks.length - 1 || disabled) return;
    onChunksChange(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
    setExpandedIndex(index + 1);
  };

  const handleSplitChunk = (index: number) => {
    if (chunks.length >= 20 || disabled) return;
    const target = chunks[index];
    if (!target) return;

    const fullText = target.chunk.content;
    const mid = Math.floor(fullText.length / 2);
    // Find nearest space or newline near midpoint
    let splitPoint = fullText.indexOf('\n', mid) !== -1 ? fullText.indexOf('\n', mid) : mid;

    // Surrogate pair boundary check:
    // If fullText[splitPoint - 1] is a high surrogate (0xD800 - 0xDBFF)
    // and fullText[splitPoint] is a low surrogate (0xDC00 - 0xDFFF),
    // adjust splitPoint by +1 so we never split a surrogate pair
    if (splitPoint > 0 && splitPoint < fullText.length) {
      const prev = fullText.charCodeAt(splitPoint - 1);
      const curr = fullText.charCodeAt(splitPoint);
      if (prev >= 0xd800 && prev <= 0xdbff && curr >= 0xdc00 && curr <= 0xdfff) {
        splitPoint += 1;
      }
    }

    const part1 = fullText.slice(0, splitPoint).trim();
    const part2 = fullText.slice(splitPoint).trim();

    const chunk1: ChunkEditorState = {
      ...target,
      chunk: {
        ...target.chunk,
        content: part1,
        originalExcerpt: part1,
      },
      locatorStatus: 'UNVERIFIED',
    };

    const chunk2: ChunkEditorState = {
      chunk: {
        clientChunkKey: generateUUID(),
        title: `${target.chunk.title} (${t('phần 2')})`,
        topic: target.chunk.topic,
        stage: target.chunk.stage,
        content: part2,
        originalExcerpt: part2,
        locator: target.chunk.locator,
        applicabilityNotes: null,
        measurementNotes: null,
      },
      selectedSpans: [],
      locatorStatus: 'UNVERIFIED',
    };

    onChunksChange(prev => {
      const next = [...prev];
      next.splice(index, 1, chunk1, chunk2);
      return next;
    });
    setExpandedIndex(index + 1);
  };

  const handleMergeNext = (index: number) => {
    if (index >= chunks.length - 1 || disabled) return;
    const current = chunks[index];
    const nextChunk = chunks[index + 1];
    if (!current || !nextChunk) return;

    const mergedContent = `${current.chunk.content}\n\n${nextChunk.chunk.content}`.trim();
    const mergedExcerpt = `${current.chunk.originalExcerpt || ''}\n\n${nextChunk.chunk.originalExcerpt || ''}`.trim();
    const mergedLocator = current.chunk.locator && nextChunk.chunk.locator
      ? `${current.chunk.locator}; ${nextChunk.chunk.locator}`
      : current.chunk.locator || nextChunk.chunk.locator;

    const combinedSpans = [...current.selectedSpans, ...nextChunk.selectedSpans].slice(0, 100);

    const mergedEntry: ChunkEditorState = {
      chunk: {
        ...current.chunk,
        content: mergedContent,
        originalExcerpt: mergedExcerpt || null,
        locator: mergedLocator || null,
      },
      selectedSpans: combinedSpans,
      locatorStatus: 'UNVERIFIED',
    };

    onChunksChange(prev => {
      const next = [...prev];
      next.splice(index, 2, mergedEntry);
      return next;
    });
    setExpandedIndex(index);
  };

  // Validation warnings
  const validationErrors: string[] = [];
  if (!metadata.title.trim()) validationErrors.push(t('Tiêu đề tài liệu không được để trống.'));
  if (metadata.title.length > 300) validationErrors.push(t('Tiêu đề tài liệu không được vượt quá 300 ký tự.'));
  if (!metadata.sourceType || !String(metadata.sourceType).trim()) {
    validationErrors.push(t('Vui lòng chọn loại nguồn tri thức.'));
  }
  if (chunks.length < 1 || chunks.length > 20) {
    validationErrors.push(t('Số lượng mảnh tri thức phải từ 1 đến 20 mảnh.'));
  }

  chunks.forEach((c, i) => {
    if (!c.chunk.title.trim()) validationErrors.push(`${t('Mảnh')} #${i + 1}: ${t('Tiêu đề mảnh không được để trống.')}`);
    if (c.chunk.title.length > 200) validationErrors.push(`${t('Mảnh')} #${i + 1}: ${t('Tiêu đề mảnh vượt quá 200 ký tự.')}`);
    if (!c.chunk.topic || !String(c.chunk.topic).trim()) {
      validationErrors.push(`${t('Mảnh')} #${i + 1}: ${t('Vui lòng chọn chủ đề cho mảnh tri thức.')}`);
    }
    if (!c.chunk.content.trim()) validationErrors.push(`${t('Mảnh')} #${i + 1}: ${t('Nội dung mảnh không được để trống.')}`);
    if (c.chunk.content.length > 8000) validationErrors.push(`${t('Mảnh')} #${i + 1}: ${t('Nội dung vượt quá 8.000 ký tự UTF-16.')}`);
    if (c.locatorStatus === 'USER_VERIFIED' && (!c.chunk.locator || !c.chunk.locator.trim())) {
      validationErrors.push(`${t('Mảnh')} #${i + 1}: ${t('Trạng thái "Đã kiểm chứng" yêu cầu phải có thông tin vị trí trích dẫn (locator).')}`);
    }
  });

  const canProceed = validationErrors.length === 0 && reviewConfirmed && !disabled;

  return (
    <div className="space-y-6">
      {/* SECTION 1: Document Metadata */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <span className="material-symbols-outlined text-navy dark:text-blue">description</span>
            {t('1. Thông tin nguồn tài liệu (Metadata)')}
          </h3>
          <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy dark:bg-blue/20 dark:text-blue">
            {t('Bản nháp (DRAFT)')}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label className={labelStyle}>
              {t('Tiêu đề tài liệu')} <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={e => handleMetadataField('title', e.target.value)}
              placeholder={t('Nhập tiêu đề tài liệu nông nghiệp...')}
              maxLength={300}
              disabled={disabled}
              className={`${inputStyle} ${fieldErrors['metadata.title'] ? 'border-coral' : ''}`}
            />
            {fieldErrors['metadata.title'] && (
              <p className="mt-1 text-xs text-coral">{fieldErrors['metadata.title']}</p>
            )}
            <p className="mt-1 text-[11px] text-gray text-right">{metadata.title.length} / 300 {t('ký tự')}</p>
          </div>

          {/* Source Type */}
          <div>
            <label className={labelStyle}>
              {t('Loại nguồn tài liệu')} <span className="text-coral">*</span>
            </label>
            <select
              value={metadata.sourceType || ''}
              onChange={e => handleMetadataField('sourceType', (e.target.value as SourceType) || (null as unknown as SourceType))}
              disabled={disabled}
              className={`${inputStyle} ${fieldErrors['metadata.sourceType'] ? 'border-coral' : ''}`}
            >
              <option value="">-- {t('Chọn loại nguồn tri thức')} --</option>
              {Object.entries(SOURCE_TYPE_CONFIG).map(([key, label]) => (
                <option key={key} value={key}>
                  {t(String(label))}
                </option>
              ))}
            </select>
            {fieldErrors['metadata.sourceType'] && (
              <p className="mt-1 text-xs text-coral">{fieldErrors['metadata.sourceType']}</p>
            )}
          </div>

          {/* Authors */}
          <div>
            <label className={labelStyle}>{t('Tác giả / Cơ quan biên soạn')}</label>
            <input
              type="text"
              value={metadata.authors || ''}
              onChange={e => handleMetadataField('authors', e.target.value || null)}
              placeholder={t('VD: TS. Nguyễn Văn A, Viện Cây ăn quả...')}
              maxLength={1000}
              disabled={disabled}
              className={inputStyle}
            />
          </div>

          {/* Publisher */}
          <div>
            <label className={labelStyle}>{t('Nhà xuất bản / Đơn vị ban hành')}</label>
            <input
              type="text"
              value={metadata.publisher || ''}
              onChange={e => handleMetadataField('publisher', e.target.value || null)}
              placeholder={t('VD: NXB Nông Nghiệp, Sở NN&PTNT...')}
              maxLength={300}
              disabled={disabled}
              className={inputStyle}
            />
          </div>

          {/* Year */}
          <div>
            <label className={labelStyle}>{t('Năm phát hành')}</label>
            <input
              type="number"
              min={1000}
              max={new Date().getFullYear()}
              value={metadata.year ?? ''}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                handleMetadataField('year', isNaN(val) ? null : val);
              }}
              placeholder={t('VD: 2024')}
              disabled={disabled}
              className={inputStyle}
            />
          </div>

          {/* Edition */}
          <div>
            <label className={labelStyle}>{t('Phiên bản / Tái bản')}</label>
            <input
              type="text"
              value={metadata.edition || ''}
              onChange={e => handleMetadataField('edition', e.target.value || null)}
              placeholder={t('VD: Tái bản lần thứ 2')}
              maxLength={100}
              disabled={disabled}
              className={inputStyle}
            />
          </div>

          {/* Source URL */}
          <div>
            <label className={labelStyle}>{t('Đường dẫn nguồn tham khảo (HTTP/HTTPS)')}</label>
            <input
              type="url"
              value={metadata.sourceUrl || ''}
              onChange={e => handleMetadataField('sourceUrl', e.target.value || null)}
              placeholder="https://example.org/tai-lieu-ky-thuat.pdf"
              maxLength={2048}
              disabled={disabled}
              className={inputStyle}
            />
          </div>

          {/* Evidence Reference */}
          <div className="sm:col-span-2">
            <label className={labelStyle}>{t('Căn cứ pháp lý / Mã số đề tài')}</label>
            <input
              type="text"
              value={metadata.evidenceReference || ''}
              onChange={e => handleMetadataField('evidenceReference', e.target.value || null)}
              placeholder={t('VD: Quyết định số 123/QĐ-BNN-TT ngày...')}
              maxLength={2000}
              disabled={disabled}
              className={inputStyle}
            />
          </div>

          {/* Provenance Notes */}
          <div className="sm:col-span-2">
            <label className={labelStyle}>{t('Ghi chú nguồn gốc tài liệu tải lên')}</label>
            <textarea
              rows={2}
              value={metadata.provenanceNotes || ''}
              onChange={e => handleMetadataField('provenanceNotes', e.target.value || null)}
              placeholder={t('Ghi chú về nguồn gốc thu thập hoặc hoàn cảnh chuyển đổi tài liệu...')}
              maxLength={4000}
              disabled={disabled}
              className={textareaStyle}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Chunks List */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              <span className="material-symbols-outlined text-navy dark:text-blue">auto_stories</span>
              {t('2. Danh sách mảnh tri thức trích xuất ({0} / 20 mảnh)', [chunks.length])}
            </h3>
            <p className="mt-0.5 text-xs text-gray">
              {t('Mỗi mảnh tri thức đại diện cho một chủ đề kỹ thuật độc lập (tối đa 8.000 ký tự UTF-16, khuyến nghị ~6.000 ký tự).')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddChunk}
            disabled={chunks.length >= 20 || disabled}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy/90 disabled:opacity-50 transition-all dark:bg-blue dark:text-bg"
          >
            <span className="material-symbols-outlined text-base">add</span>
            {t('Thêm mảnh mới')}
          </button>
        </div>

        {/* Chunks Accordion */}
        <div className="space-y-3">
          {chunks.map((item, idx) => {
            const { chunk, locatorStatus } = item;
            const isExpanded = expandedIndex === idx;
            const statusConfig = LOCATOR_STATUS_CONFIG[locatorStatus];

            return (
              <div
                key={chunk.clientChunkKey}
                className={`rounded-xl border transition-all ${
                  isExpanded ? 'border-navy/60 bg-bg shadow-sm dark:border-blue/60' : 'border-border bg-bg/50 hover:border-gray/40'
                }`}
              >
                {/* Chunk Header / Summary Bar */}
                <div
                  className="flex items-center justify-between p-3.5 cursor-pointer select-none"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy/10 text-xs font-bold text-navy dark:bg-blue/20 dark:text-blue shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate">
                        {chunk.title || t('Mảnh #{0} (Chưa đặt tiêu đề)', [idx + 1])}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray">
                        <span>{t('Chủ đề:')} {chunk.topic ? t(String(TOPIC_CONFIG[chunk.topic as Topic] || chunk.topic)) : t('Chưa chọn')}</span>
                        <span>•</span>
                        <span>{t('{0} ký tự', [chunk.content.length.toLocaleString()])}</span>
                        {chunk.locator && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs font-mono">{chunk.locator}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Locator Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusConfig.badgeClass}`}
                      title={t(statusConfig.description)}
                    >
                      <span className="material-symbols-outlined text-[13px]">{statusConfig.icon}</span>
                      {t(statusConfig.label)}
                    </span>

                    <span className="material-symbols-outlined text-gray text-base">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                {/* Expanded Chunk Details */}
                {isExpanded && (
                  <div className="border-t border-border/80 p-4 space-y-4">
                    {/* Chunk Toolbar Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0 || disabled}
                          className="rounded-lg p-1.5 text-gray hover:text-text hover:bg-card disabled:opacity-30"
                          title={t('Di chuyển lên trên')}
                        >
                          <span className="material-symbols-outlined text-base">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === chunks.length - 1 || disabled}
                          className="rounded-lg p-1.5 text-gray hover:text-text hover:bg-card disabled:opacity-30"
                          title={t('Di chuyển xuống dưới')}
                        >
                          <span className="material-symbols-outlined text-base">arrow_downward</span>
                        </button>
                        <span className="text-border mx-1">|</span>
                        <button
                          type="button"
                          onClick={() => handleSplitChunk(idx)}
                          disabled={chunks.length >= 20 || disabled}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray hover:text-navy hover:bg-card dark:hover:text-blue"
                          title={t('Tách mảnh này thành 2 mảnh')}
                        >
                          <span className="material-symbols-outlined text-sm">call_split</span>
                          {t('Tách đôi mảnh')}
                        </button>
                        {idx < chunks.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMergeNext(idx)}
                            disabled={disabled}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray hover:text-navy hover:bg-card dark:hover:text-blue"
                            title={t('Gộp mảnh này với mảnh liền kề phía dưới')}
                          >
                            <span className="material-symbols-outlined text-sm">call_merge</span>
                            {t('Gộp với mảnh kế tiếp')}
                          </button>
                        )}
                      </div>

                      {chunks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChunk(idx)}
                          disabled={disabled}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-coral hover:bg-coral/10"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          {t('Xóa mảnh này')}
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Chunk Title */}
                      <div className="sm:col-span-2">
                        <label className={labelStyle}>
                          {t('Tiêu đề mảnh')} <span className="text-coral">*</span>
                        </label>
                        <input
                          type="text"
                          value={chunk.title}
                          onChange={e => updateChunk(idx, { title: e.target.value })}
                          placeholder="Tiêu đề nội dung mảnh tri thức..."
                          maxLength={200}
                          disabled={disabled}
                          className={inputStyle}
                        />
                      </div>

                      {/* Topic */}
                      <div>
                        <label className={labelStyle}>
                          {t('Chủ đề chuyên môn')} <span className="text-coral">*</span>
                        </label>
                        <select
                          value={chunk.topic || ''}
                          onChange={e => updateChunk(idx, { topic: (e.target.value as Topic) || (null as unknown as Topic) })}
                          disabled={disabled}
                          className={inputStyle}
                        >
                          <option value="">-- {t('Chọn chủ đề')} --</option>
                          {Object.entries(TOPIC_CONFIG).map(([key, label]) => (
                            <option key={key} value={key}>
                              {t(String(label))}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Growth Stage */}
                      <div>
                        <label className={labelStyle}>{t('Giai đoạn sinh trưởng (Tùy chọn)')}</label>
                        <select
                          value={chunk.stage || ''}
                          onChange={e => updateChunk(idx, { stage: (e.target.value as GrowthStage) || null })}
                          disabled={disabled}
                          className={inputStyle}
                        >
                          <option value="">{t('Tất cả / Không phân giai đoạn')}</option>
                          {Object.entries(GROWTH_STAGE_CONFIG).map(([key, label]) => (
                            <option key={key} value={key}>
                              {t(String(label))}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Content */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-text">
                            {t('Nội dung kỹ thuật của mảnh')} <span className="text-coral">*</span>
                          </label>
                          <span
                            className={`text-[11px] font-mono ${
                              chunk.content.length > 8000 ? 'text-coral font-bold' : 'text-gray'
                            }`}
                          >
                            {t('{0} / 8.000 ký tự UTF-16', [chunk.content.length.toLocaleString()])}
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          value={chunk.content}
                          onChange={e => updateChunk(idx, { content: e.target.value })}
                          placeholder={t('Nội dung kiến thức kỹ thuật chi tiết của mảnh...')}
                          disabled={disabled}
                          className={textareaStyle}
                        />
                        {chunk.content.length > 8000 && (
                          <p className="mt-1 text-xs text-coral">
                            {t('Nội dung vượt quá giới hạn 8.000 ký tự. Vui lòng bấm "Tách đôi mảnh" để chia nhỏ.')}
                          </p>
                        )}
                      </div>

                      {/* Original Excerpt */}
                      <div className="sm:col-span-2">
                        <label className={labelStyle}>{t('Trích đoạn gốc từ tài liệu (Original Excerpt)')}</label>
                        <textarea
                          rows={3}
                          value={chunk.originalExcerpt || ''}
                          onChange={e => updateChunk(idx, { originalExcerpt: e.target.value || null })}
                          placeholder={t('Đoạn văn trích nguyên văn từ tài liệu nguồn...')}
                          maxLength={12000}
                          disabled={disabled}
                          className={textareaStyle}
                        />
                        <p className="mt-0.5 text-[11px] text-gray">
                          {t('Dùng để đối chiếu và kiểm chứng nguồn gốc với tệp tài liệu.')}
                        </p>
                      </div>

                      {/* Locator & Locator Assurance */}
                      <div>
                        <label className={labelStyle}>{t('Chỉ mục vị trí trong tài liệu (Locator)')}</label>
                        <input
                          type="text"
                          value={chunk.locator || ''}
                          onChange={e => updateChunk(idx, { locator: e.target.value || null })}
                          placeholder={t('VD: Trang 3-4; Đoạn 12...')}
                          maxLength={500}
                          disabled={disabled}
                          className={inputStyle}
                        />
                      </div>

                      {/* Locator Status Selector */}
                      <div>
                        <label className={labelStyle}>{t('Độ tin cậy trích dẫn (Locator Assurance)')}</label>
                        <select
                          value={locatorStatus}
                          onChange={e =>
                            updateChunk(idx, {}, e.target.value as LocatorStatus)
                          }
                          disabled={disabled}
                          className={inputStyle}
                        >
                          <option value="EXACT_SPAN">{t('Khớp chính xác (EXACT_SPAN)')}</option>
                          <option value="USER_VERIFIED" disabled={!chunk.locator?.trim()}>
                            {t('Người dùng đã kiểm chứng (USER_VERIFIED)')}{!chunk.locator?.trim() ? t(' - Cần có locator') : ''}
                          </option>
                          <option value="UNVERIFIED">{t('Chưa kiểm chứng / Đã sửa đổi (UNVERIFIED)')}</option>
                        </select>
                        <p className="mt-1 text-[11px] text-gray leading-tight">
                          {t(statusConfig.description)}
                        </p>
                      </div>

                      {/* Applicability Notes */}
                      <div>
                        <label className={labelStyle}>{t('Ghi chú phạm vi áp dụng (Tùy chọn)')}</label>
                        <textarea
                          rows={2}
                          value={chunk.applicabilityNotes || ''}
                          onChange={e => updateChunk(idx, { applicabilityNotes: e.target.value || null })}
                          placeholder={t('VD: Chỉ áp dụng cho đất thịt nhẹ...')}
                          maxLength={4000}
                          disabled={disabled}
                          className={textareaStyle}
                        />
                      </div>

                      {/* Measurement Notes */}
                      <div>
                        <label className={labelStyle}>{t('Ghi chú đơn vị đo lường (Tùy chọn)')}</label>
                        <textarea
                          rows={2}
                          value={chunk.measurementNotes || ''}
                          onChange={e => updateChunk(idx, { measurementNotes: e.target.value || null })}
                          placeholder={t('VD: Lượng nước tính theo lít/gốc/ngày...')}
                          maxLength={4000}
                          disabled={disabled}
                          className={textareaStyle}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Review Confirmation & Proceed */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <span className="material-symbols-outlined text-navy dark:text-blue">fact_check</span>
          {t('3. Xác nhận rà soát và tạo bản nháp (DRAFT)')}
        </h3>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div className="rounded-xl border border-coral/30 bg-coral/10 p-3.5 text-xs text-coral dark:bg-coral/20">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base">warning</span>
              {t('Vui lòng hoàn thiện các thông tin sau trước khi xác nhận:')}
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Checkbox reviewConfirmed */}
        <label className="flex items-start gap-3 rounded-xl border border-border bg-bg p-3.5 cursor-pointer hover:border-gray/50 transition-colors">
          <input
            type="checkbox"
            checked={reviewConfirmed}
            onChange={e => onReviewConfirmedChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-border text-navy focus:ring-navy/40 dark:text-blue"
          />
          <div className="text-xs text-text leading-relaxed">
            <span className="font-semibold block mb-0.5">
              {t('Cam kết xác nhận rà soát (reviewConfirmed = true)')}
            </span>
            {t('Tôi xác nhận đã kiểm tra toàn bộ văn bản trích xuất, chấp nhận các phần bị lược bỏ (nếu có), đồng ý với cấu trúc phân mảnh và chỉ mục vị trí này để tạo thành hồ sơ bản nháp (DRAFT).')}
          </div>
        </label>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onProceedToConfirm}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-navy/90 transition-all focus:outline-none focus:ring-2 focus:ring-navy/40 dark:bg-blue dark:text-bg dark:hover:bg-blue/90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {t('Tiếp tục đến bước')} {t('Xác nhận tạo bản nháp tri thức')}
          </button>
        </div>
      </div>
    </div>
  );
}
