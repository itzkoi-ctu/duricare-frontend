/**
 * FE-KNOWLEDGE-IMPORT-001 ImportChunkEditor component
 * Document metadata form, chunk list manager (1..20 chunks), locator assurance & downgrade logic, review confirmation per Stitch design
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

export function initializeChunksFromProposals(
  proposals: ProposedChunk[],
  _extraction: Extraction | null
): ChunkEditorState[] {
  if (proposals.length > 0) {
    return proposals.slice(0, 20).map((prop, idx) => ({
      chunk: {
        clientChunkKey: generateUUID(),
        title: prop.title || `${t('Đoạn')} #${idx + 1}`,
        topic: prop.topic || ('' as unknown as Topic),
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

  return [
    {
      chunk: {
        clientChunkKey: generateUUID(),
        title: `${t('Đoạn')} #1`,
        topic: '' as unknown as Topic,
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
  const [isOptionalMetaOpen, setIsOptionalMetaOpen] = useState(false);

  const handleMetadataField = <K extends keyof KnowledgeMetadata>(field: K, value: KnowledgeMetadata[K]) => {
    if (disabled) return;
    onMetadataChange({
      ...metadata,
      [field]: value,
    });
  };

  const handleChunkField = (index: number, field: keyof ChunkInput, value: unknown) => {
    if (disabled) return;
    onChunksChange(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;

      // Downgrade EXACT_SPAN to UNVERIFIED if content, originalExcerpt, or locator is modified
      let nextStatus = target.locatorStatus;
      if (
        (field === 'content' || field === 'originalExcerpt' || field === 'locator') &&
        target.locatorStatus === 'EXACT_SPAN'
      ) {
        nextStatus = 'UNVERIFIED';
      }

      // If locator is cleared and status was USER_VERIFIED, downgrade to UNVERIFIED
      if (field === 'locator' && !String(value || '').trim() && target.locatorStatus === 'USER_VERIFIED') {
        nextStatus = 'UNVERIFIED';
      }

      next[index] = {
        ...target,
        chunk: {
          ...target.chunk,
          [field]: value,
        },
        locatorStatus: nextStatus,
      };
      return next;
    });
  };

  const handleLocatorStatusChange = (index: number, status: LocatorStatus) => {
    if (disabled) return;
    onChunksChange(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      if (status === 'USER_VERIFIED' && !target.chunk.locator?.trim()) {
        return prev;
      }
      next[index] = {
        ...target,
        locatorStatus: status,
      };
      return next;
    });
  };

  const handleAddChunk = () => {
    if (chunks.length >= 20 || disabled) return;
    const newEntry: ChunkEditorState = {
      chunk: {
        clientChunkKey: generateUUID(),
        title: `${t('Đoạn')} #${chunks.length + 1}`,
        topic: '' as unknown as Topic,
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
    let splitPoint = fullText.indexOf('\n', mid) !== -1 ? fullText.indexOf('\n', mid) : mid;

    // Surrogate pair boundary preservation:
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

  // Validation checking
  const validationErrors: string[] = [];
  if (!metadata.title.trim()) validationErrors.push(t('Tiêu đề tài liệu không được để trống.'));
  if (metadata.title.length > 300) validationErrors.push(t('Tiêu đề tài liệu không được vượt quá 300 ký tự.'));
  if (!metadata.sourceType || !String(metadata.sourceType).trim()) {
    validationErrors.push(t('Cần chọn loại nguồn tài liệu trong phần Thông tin chung.'));
  }
  if (chunks.length < 1 || chunks.length > 20) {
    validationErrors.push(t('Số lượng đoạn tri thức phải từ 1 đến 20 đoạn.'));
  }

  chunks.forEach((c, i) => {
    const chunkNum = i + 1;
    if (!c.chunk.title.trim()) validationErrors.push(`${t('Đoạn')} ${chunkNum}: ${t('Tiêu đề đoạn trích không được để trống.')}`);
    if (c.chunk.title.length > 200) validationErrors.push(`${t('Đoạn')} ${chunkNum}: ${t('Tiêu đề đoạn trích vượt quá 200 ký tự.')}`);
    if (!c.chunk.topic || !String(c.chunk.topic).trim()) {
      validationErrors.push(`${t('Đoạn')} ${chunkNum}: ${t('Cần chọn chủ đề kỹ thuật.')}`);
    }
    if (!c.chunk.content.trim()) validationErrors.push(`${t('Đoạn')} ${chunkNum}: ${t('Nội dung đoạn trích không được để trống.')}`);
    if (c.chunk.content.length > 8000) validationErrors.push(`${t('Đoạn')} ${chunkNum}: ${t('Nội dung vượt quá 8.000 ký tự UTF-16.')}`);
  });

  const canProceed = validationErrors.length === 0 && reviewConfirmed && !disabled;

  return (
    <div className="space-y-4 pb-28 lg:pb-0" data-testid="import-chunk-editor">
      {/* 5.1 METADATA CARD */}
      <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
            <h3 className="font-semibold text-text text-sm md:text-base">
              {t('Thông tin tài liệu chung')}
            </h3>
          </div>
          <span className="text-xs text-gray font-medium">
            {t('Bắt buộc nhập các mục có dấu (*)')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tiêu đề tài liệu * */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-text">
              {t('Tiêu đề tài liệu')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-testid="input-document-title"
              value={metadata.title}
              onChange={e => handleMetadataField('title', e.target.value)}
              placeholder={t('Nhập tiêu đề tài liệu kỹ thuật...')}
              maxLength={300}
              disabled={disabled}
              className={`w-full h-10 px-3 text-sm bg-surface border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                fieldErrors['metadata.title'] ? 'border-red-400' : 'border-border'
              }`}
            />
            {fieldErrors['metadata.title'] && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors['metadata.title']}</p>
            )}
          </div>

          {/* Loại nguồn tài liệu * */}
          <div className="md:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text">
                {t('Loại nguồn tài liệu')} <span className="text-red-500">*</span>
              </label>
              {(!metadata.sourceType || !String(metadata.sourceType).trim()) && (
                <span
                  data-testid="badge-source-type-warning"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                >
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  <span>{t('Chưa chọn nguồn')}</span>
                </span>
              )}
            </div>
            <select
              data-testid="select-source-type"
              value={metadata.sourceType || ''}
              onChange={e =>
                handleMetadataField(
                  'sourceType',
                  (e.target.value as SourceType) || ('' as unknown as SourceType)
                )
              }
              disabled={disabled}
              className={`w-full h-10 px-3 text-sm bg-surface border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                !metadata.sourceType ? 'border-amber-300 dark:border-amber-700' : 'border-border'
              }`}
            >
              <option value="">{t('Chọn loại nguồn tri thức')}</option>
              {Object.entries(SOURCE_TYPE_CONFIG).map(([key, label]) => (
                <option key={key} value={key}>
                  {t(String(label))}
                </option>
              ))}
            </select>
            {fieldErrors['metadata.sourceType'] && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors['metadata.sourceType']}</p>
            )}
          </div>
        </div>

        {/* Collapsed disclosure for optional fields */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            data-testid="toggle-optional-metadata"
            onClick={() => setIsOptionalMetaOpen(!isOptionalMetaOpen)}
            className="w-full flex items-center justify-between text-xs text-gray hover:text-primary font-medium py-1 cursor-pointer transition-colors text-left gap-2"
          >
            <span className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="material-symbols-outlined text-[16px] shrink-0">tune</span>
              <span className="line-clamp-1">{t('Thông tin bổ sung (Tác giả, Nhà xuất bản, Năm phát hành, Ghi chú xuất xứ...)')}</span>
            </span>
            <span
              className={`material-symbols-outlined text-[16px] shrink-0 transition-transform ${
                isOptionalMetaOpen ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {isOptionalMetaOpen && (
            <div
              data-testid="optional-metadata-fields"
              className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-surface-hover/50 rounded-lg border border-border/60 text-xs"
            >
              <div>
                <label className="block text-gray mb-1">{t('Tác giả / Nhóm biên soạn')}</label>
                <input
                  type="text"
                  data-testid="input-authors"
                  value={metadata.authors || ''}
                  onChange={e => handleMetadataField('authors', e.target.value || null)}
                  placeholder={t('Khoa Nông nghiệp, Trường ĐH Cần Thơ')}
                  maxLength={1000}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-gray mb-1">{t('Nhà xuất bản / Đơn vị ban hành')}</label>
                <input
                  type="text"
                  data-testid="input-publisher"
                  value={metadata.publisher || ''}
                  onChange={e => handleMetadataField('publisher', e.target.value || null)}
                  placeholder={t('NXB Nông Nghiệp, Chi cục Trồng trọt...')}
                  maxLength={300}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-gray mb-1">{t('Năm phát hành')}</label>
                <input
                  type="number"
                  data-testid="input-year"
                  value={metadata.year ?? ''}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    handleMetadataField('year', isNaN(val) ? null : val);
                  }}
                  placeholder="2024"
                  min={1000}
                  max={new Date().getFullYear()}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-gray mb-1">{t('Phiên bản / Tái bản')}</label>
                <input
                  type="text"
                  data-testid="input-edition"
                  value={metadata.edition || ''}
                  onChange={e => handleMetadataField('edition', e.target.value || null)}
                  placeholder={t('Tái bản lần thứ 2')}
                  maxLength={100}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray mb-1">{t('Đường dẫn nguồn tham khảo (URL)')}</label>
                <input
                  type="url"
                  data-testid="input-source-url"
                  value={metadata.sourceUrl || ''}
                  onChange={e => handleMetadataField('sourceUrl', e.target.value || null)}
                  placeholder="https://example.org/tai-lieu.pdf"
                  maxLength={2048}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray mb-1">{t('Minh chứng tham chiếu (Tùy chọn)')}</label>
                <input
                  type="text"
                  data-testid="input-evidence-reference"
                  value={metadata.evidenceReference || ''}
                  onChange={e => handleMetadataField('evidenceReference', e.target.value || null)}
                  placeholder={t('Số hiệu công văn, quyết định ban hành...')}
                  maxLength={2000}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray mb-1">{t('Ghi chú xuất xứ & Đơn vị thẩm định gốc')}</label>
                <input
                  type="text"
                  data-testid="input-provenance-notes"
                  value={metadata.provenanceNotes || ''}
                  onChange={e => handleMetadataField('provenanceNotes', e.target.value || null)}
                  placeholder={t('Tài liệu lưu hành nội bộ phục vụ dự án chuyển giao kỹ thuật')}
                  maxLength={4000}
                  disabled={disabled}
                  className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>

        {/* Read-only proposedTier indicator */}
        <div data-testid="proposed-tier-field" className="border-t border-border/60 pt-2.5 flex items-center justify-between text-xs text-gray">
          <span>{t('Tầng chất lượng đề xuất:')}</span>
          <span className="font-semibold text-text">{t('UNKNOWN (Chưa xác định)')}</span>
        </div>
      </div>

      {/* 5.2 SECTION: CHUNKS LIST */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-semibold text-text">
              {t('Đoạn trích nội dung')}{' '}
              <span className="text-primary tabular-nums font-bold">
                ({chunks.length} / 20)
              </span>
            </h3>
            <p className="text-xs text-gray">
              {t('Chuẩn hóa cấu trúc nội dung kỹ thuật trước khi chuyển giao thẩm định.')}
            </p>
          </div>

          {/* Button "+ Thêm đoạn" (44px height) */}
          <button
            type="button"
            data-testid="add-chunk-button"
            onClick={handleAddChunk}
            disabled={chunks.length >= 20 || disabled}
            className="h-11 min-h-[44px] px-4 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>{t('Thêm đoạn')}</span>
          </button>
        </div>

        {/* List of Chunks */}
        <div className="space-y-3" data-testid="chunks-container">
          {chunks.map((item, index) => {
            const isExpanded = expandedIndex === index;
            const chunkNum = index + 1;
            const hasChunkError =
              !item.chunk.title.trim() ||
              !item.chunk.topic ||
              !String(item.chunk.topic).trim() ||
              !item.chunk.content.trim() ||
              Boolean(fieldErrors[`chunks[${index}].title`]) ||
              Boolean(fieldErrors[`chunks[${index}].topic`]) ||
              Boolean(fieldErrors[`chunks[${index}].content`]);

            // Auto-expand if chunk has error and user is in collapsed view
            const currentlyOpen = isExpanded || (hasChunkError && expandedIndex === null);

            return currentlyOpen ? (
              /* EXPANDED CHUNK CARD */
              <div
                key={item.chunk.clientChunkKey || index}
                data-testid={`chunk-card-${chunkNum}`}
                id={`chunk-${chunkNum}`}
                className="bg-surface rounded-xl border-2 border-primary/50 shadow-xs p-3.5 sm:p-4 md:p-5 space-y-3.5 relative"
              >
                {/* Header Bar */}
                <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span className="font-bold text-sm text-text bg-surface-hover px-2.5 py-1 rounded shrink-0">
                      {t('Đoạn')} {chunkNum}
                    </span>

                    {/* Locator Status Badge (24px height, 6px radius) */}
                    {item.locatorStatus === 'EXACT_SPAN' ? (
                      <span
                        data-testid={`locator-status-${chunkNum}`}
                        className="h-6 px-2.5 rounded-[6px] bg-blue-50 text-primary border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <span className="material-symbols-outlined badge-icon">verified</span>
                        <span>{t('Cần đối chiếu')}</span>
                      </span>
                    ) : item.locatorStatus === 'USER_VERIFIED' ? (
                      <span
                        data-testid={`locator-status-${chunkNum}`}
                        className="h-6 px-2.5 rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <span className="material-symbols-outlined badge-icon">check_circle</span>
                        <span>{t('Đã xác thực vị trí')}</span>
                      </span>
                    ) : (
                      <span
                        data-testid={`locator-status-${chunkNum}`}
                        className="h-6 px-2.5 rounded-[6px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <span className="material-symbols-outlined badge-icon">schedule</span>
                        <span>{t('Cần đối chiếu')}</span>
                      </span>
                    )}
                  </div>

                  {/* Reorder & Action Controls (44px touch targets) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      data-testid={`chunk-move-up-${chunkNum}`}
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || disabled}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-gray hover:text-text hover:bg-surface-hover flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={t('Di chuyển lên')}
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`chunk-move-down-${chunkNum}`}
                      onClick={() => handleMoveDown(index)}
                      disabled={index === chunks.length - 1 || disabled}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-gray hover:text-text hover:bg-surface-hover flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={t('Di chuyển xuống')}
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`chunk-remove-${chunkNum}`}
                      onClick={() => handleRemoveChunk(index)}
                      disabled={chunks.length <= 1 || disabled}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={t('Xóa đoạn này')}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Inline Command Row (Split / Merge) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    data-testid={`chunk-split-${chunkNum}`}
                    onClick={() => handleSplitChunk(index)}
                    disabled={chunks.length >= 20 || disabled}
                    className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border bg-surface-hover/60 hover:bg-surface-hover text-text text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">vertical_split</span>
                    <span>{t('Tách đôi đoạn này')}</span>
                  </button>
                  {index < chunks.length - 1 && (
                    <button
                      type="button"
                      data-testid={`chunk-merge-${chunkNum}`}
                      onClick={() => handleMergeNext(index)}
                      disabled={disabled}
                      className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border bg-surface-hover/60 hover:bg-surface-hover text-text text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]">merge</span>
                      <span>{t('Gộp với đoạn tiếp theo')}</span>
                    </button>
                  )}
                </div>

                {/* Form Fields for Chunk */}
                <div className="space-y-3 pt-1">
                  {/* Tiêu đề đoạn trích * */}
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      {t('Tiêu đề đoạn trích')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid={`chunk-title-input-${chunkNum}`}
                      value={item.chunk.title}
                      onChange={e => handleChunkField(index, 'title', e.target.value)}
                      maxLength={200}
                      disabled={disabled}
                      className="w-full h-9 px-3 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Chủ đề * */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-text">
                          {t('Chủ đề')} <span className="text-red-500">*</span>
                        </label>
                        {(!item.chunk.topic || !String(item.chunk.topic).trim()) && (
                          <span className="text-[11px] text-red-600 font-medium">
                            {t('Cần chọn chủ đề')}
                          </span>
                        )}
                      </div>
                      <select
                        data-testid={`chunk-topic-select-${chunkNum}`}
                        value={item.chunk.topic || ''}
                        onChange={e =>
                          handleChunkField(
                            index,
                            'topic',
                            (e.target.value as Topic) || ('' as unknown as Topic)
                          )
                        }
                        disabled={disabled}
                        className={`w-full h-9 px-3 text-xs bg-surface border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                          !item.chunk.topic ? 'border-red-300 dark:border-red-800' : 'border-border'
                        }`}
                      >
                        <option value="">{t('Chọn chủ đề')}</option>
                        {Object.entries(TOPIC_CONFIG).map(([key, label]) => (
                          <option key={key} value={key}>
                            {t(String(label))}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Giai đoạn sinh trưởng (Tùy chọn) */}
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">
                        {t('Giai đoạn sinh trưởng')}{' '}
                        <span className="text-gray font-normal">({t('Tùy chọn')})</span>
                      </label>
                      <select
                        data-testid={`chunk-stage-select-${chunkNum}`}
                        value={item.chunk.stage || ''}
                        onChange={e =>
                          handleChunkField(
                            index,
                            'stage',
                            (e.target.value as GrowthStage) || null
                          )
                        }
                        disabled={disabled}
                        className="w-full h-9 px-3 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      >
                        <option value="">{t('Chưa chọn')}</option>
                        {Object.entries(GROWTH_STAGE_CONFIG).map(([key, label]) => (
                          <option key={key} value={key}>
                            {t(String(label))}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nội dung chuẩn hóa kỹ thuật * (14px, 22px line height, max 8000) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-text">
                        {t('Nội dung chuẩn hóa kỹ thuật')} <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray tabular-nums">
                        {item.chunk.content.length} / 8.000 {t('ký tự')}
                      </span>
                    </div>
                    <textarea
                      data-testid={`chunk-content-textarea-${chunkNum}`}
                      rows={4}
                      value={item.chunk.content}
                      onChange={e => handleChunkField(index, 'content', e.target.value)}
                      maxLength={8000}
                      disabled={disabled}
                      className="w-full p-3 text-sm leading-[22px] bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans resize-y"
                    />
                  </div>

                  {/* Collapsible Disclosure: Trích đoạn gốc và vị trí */}
                  <details className="border border-border rounded-lg overflow-hidden bg-surface-hover/30 group">
                    <summary className="w-full p-2.5 flex items-center justify-between text-xs font-medium text-text cursor-pointer hover:bg-surface-hover transition-colors list-none select-none">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-gray">
                          format_quote
                        </span>
                        <span>{t('Trích đoạn gốc và vị trí trích dẫn')}</span>
                        {item.chunk.locator && (
                          <span className="text-[11px] text-gray">({item.chunk.locator})</span>
                        )}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-gray transform group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <div className="p-3 border-t border-border text-xs space-y-3 bg-surface">
                      <div>
                        <label className="block text-gray mb-1">{t('Trích đoạn gốc:')}</label>
                        <textarea
                          rows={2}
                          data-testid={`chunk-excerpt-input-${chunkNum}`}
                          value={item.chunk.originalExcerpt || ''}
                          onChange={e => handleChunkField(index, 'originalExcerpt', e.target.value || null)}
                          placeholder={t('Trích dẫn câu/đoạn gốc từ tài liệu để làm đối chứng...')}
                          maxLength={12000}
                          disabled={disabled}
                          className="w-full p-2 bg-surface-hover/40 rounded border border-border font-mono text-[11px] text-text disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-gray mb-1">{t('Vị trí tham chiếu (Trang / Mục / Bảng):')}</label>
                        <input
                          type="text"
                          data-testid={`chunk-locator-input-${chunkNum}`}
                          value={item.chunk.locator || ''}
                          onChange={e => handleChunkField(index, 'locator', e.target.value || null)}
                          placeholder={t('VD: Mục 1.6.1 · Trang 24')}
                          maxLength={500}
                          disabled={disabled}
                          className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                        />
                      </div>

                      {/* Mức độ bảo đảm vị trí trích dẫn */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-text">{t('Mức độ bảo đảm vị trí trích dẫn')}</label>
                          <span className={`inline-flex items-center gap-1 rounded-[6px] h-6 px-2 text-[11px] font-medium ${LOCATOR_STATUS_CONFIG[item.locatorStatus].badgeClass}`}>
                            <span className="material-symbols-outlined text-[13px]">{LOCATOR_STATUS_CONFIG[item.locatorStatus].icon}</span>
                            {t(LOCATOR_STATUS_CONFIG[item.locatorStatus].label)}
                          </span>
                        </div>
                        <select
                          value={item.locatorStatus}
                          onChange={e => handleLocatorStatusChange(index, e.target.value as LocatorStatus)}
                          disabled={disabled}
                          data-testid={`chunk-locator-status-${chunkNum}`}
                          className="w-full h-8 px-2.5 bg-surface border border-border rounded text-xs text-text disabled:opacity-60"
                        >
                          {item.locatorStatus === 'EXACT_SPAN' && (
                            <option value="EXACT_SPAN">{t('Khớp chính xác với đoạn văn bản trích xuất (EXACT_SPAN)')}</option>
                          )}
                          <option value="USER_VERIFIED" disabled={!item.chunk.locator?.trim()}>
                            {t('Người dùng đã kiểm chứng (USER_VERIFIED)')}{!item.chunk.locator?.trim() ? t(' - Cần có locator') : ''}
                          </option>
                          <option value="UNVERIFIED">{t('Chưa kiểm chứng / Đã sửa đổi (UNVERIFIED)')}</option>
                        </select>
                        <p className="mt-1 text-[11px] text-gray leading-tight">
                          {t(LOCATOR_STATUS_CONFIG[item.locatorStatus].description)}
                        </p>
                      </div>
                    </div>
                  </details>

                  {/* Collapsible Disclosure: Ghi chú phạm vi áp dụng & đo lường */}
                  <details className="border border-border rounded-lg overflow-hidden bg-surface-hover/30 group">
                    <summary className="w-full p-2.5 flex items-center justify-between text-xs font-medium text-text cursor-pointer hover:bg-surface-hover transition-colors list-none select-none">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-gray">
                          straighten
                        </span>
                        <span>{t('Ghi chú phạm vi áp dụng & đo lường')}</span>
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-gray transform group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <div className="p-3 border-t border-border text-xs space-y-2 bg-surface">
                      <div>
                        <label className="block text-gray mb-1">{t('Ghi chú phạm vi áp dụng:')}</label>
                        <input
                          type="text"
                          data-testid={`chunk-applicability-notes-${chunkNum}`}
                          value={item.chunk.applicabilityNotes || ''}
                          onChange={e => handleChunkField(index, 'applicabilityNotes', e.target.value || null)}
                          placeholder={t('Áp dụng cho giống Ri6, Monthong vùng phù sa ngọt...')}
                          maxLength={4000}
                          disabled={disabled}
                          className="w-full h-8 px-2.5 text-xs bg-surface border border-border rounded text-text disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-gray mb-1">{t('Ghi chú phương pháp đo lường:')}</label>
                        <input
                          type="text"
                          data-testid={`chunk-measurement-notes-${chunkNum}`}
                          value={item.chunk.measurementNotes || ''}
                          onChange={e => handleChunkField(index, 'measurementNotes', e.target.value || null)}
                          placeholder={t('Đo bằng máy đo khúc xạ độ mặn EC...')}
                          maxLength={4000}
                          disabled={disabled}
                          className="w-full h-8 px-2.5 text-xs bg-surface border border-border rounded text-text disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              /* COLLAPSED CHUNK CARD (Accordioned) */
              <div
                key={item.chunk.clientChunkKey || index}
                data-testid={`chunk-collapsed-${chunkNum}`}
                id={`chunk-${chunkNum}`}
                className="bg-surface rounded-xl border border-border shadow-xs p-3.5 sm:p-4 hover:border-gray/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-text bg-surface-hover px-2 py-0.5 rounded shrink-0">
                      {t('Đoạn')} {chunkNum}
                    </span>
                    <span className="h-6 px-2.5 rounded-[6px] bg-surface-hover text-gray border border-border/60 text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                      <span className="material-symbols-outlined badge-icon">check</span>
                      <span>{t('Cần đối chiếu')}</span>
                    </span>
                    {item.chunk.locator && (
                      <>
                        <span className="text-xs text-gray">·</span>
                        <span className="text-xs text-gray truncate">{item.chunk.locator}</span>
                      </>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-text truncate">
                    {item.chunk.title || `${t('Đoạn')} #${chunkNum}`}
                  </h4>
                  <p className="text-xs text-gray line-clamp-1">
                    {item.chunk.content || t('(Chưa có nội dung)')}
                  </p>
                </div>

                {/* 44px Expand / Edit Button */}
                <button
                  type="button"
                  data-testid={`chunk-expand-button-${chunkNum}`}
                  onClick={() => setExpandedIndex(index)}
                  className="h-11 min-h-[44px] px-4 rounded-lg border border-border hover:bg-surface-hover text-xs font-semibold text-text flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
                >
                  <span>{t('Mở sửa')}</span>
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5.3 VALIDATION SUMMARY BANNER */}
      {validationErrors.length > 0 && (
        <div
          data-testid="validation-summary-banner"
          className="bg-amber-50/80 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">
            notification_important
          </span>
          <div className="space-y-1">
            <span className="font-bold text-amber-950 dark:text-amber-100">
              {t('Cần hoàn thiện {0} thông tin trước khi tiếp tục:', [validationErrors.length])}
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-900 dark:text-amber-300">
              {validationErrors.slice(0, 5).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
              {validationErrors.length > 5 && (
                <li className="italic">{t('Và {0} lỗi khác...', [validationErrors.length - 5])}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 5.4 BOTTOM ACTION PANEL (Review & Commit) */}
      <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
        {/* Explicit unchecked confirmation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="review-confirmed-checkbox"
            checked={reviewConfirmed}
            onChange={e => onReviewConfirmedChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary shrink-0 disabled:opacity-60"
          />
          <span className="text-xs text-text font-medium leading-relaxed">
            {t(
              'Tôi đã rà soát văn bản trích xuất, phần lược bỏ, cách chia đoạn và vị trí trích dẫn; đồng ý dùng nội dung đã kiểm tra để tạo bản nháp.'
            )}
          </span>
        </label>

        {/* Action Row */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-1 gap-2.5">
          <button
            type="button"
            data-testid="cancel-session-button"
            onClick={() => {
              if (window.confirm(t('Bạn có chắc chắn muốn hủy phiên làm việc này?'))) {
                window.location.reload();
              }
            }}
            disabled={disabled}
            className="h-11 min-h-[44px] px-4 rounded-lg border border-border text-text hover:bg-surface-hover text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center"
          >
            {t('Hủy phiên')}
          </button>

          {/* Primary CTA Button (44px height, blue #1f5ca9, radius 8px) */}
          <button
            type="button"
            data-testid="proceed-confirm-button"
            onClick={onProceedToConfirm}
            disabled={!canProceed || disabled}
            className="h-11 min-h-[44px] px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{t('Tiếp tục tạo bản nháp')}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        <p className="text-[11px] text-gray text-center">
          {t(
            'Các chỉnh sửa này chưa được lưu trên máy chủ. Nhấn "Tiếp tục tạo bản nháp" để tạo bản nháp nội bộ trước khi thẩm định.'
          )}
        </p>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR (Positioned strictly above mobile bottom navigation) */}
      <div className="lg:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-3 bg-surface border-t border-border shadow-lg z-30">
        <button
          type="button"
          data-testid="mobile-proceed-to-confirm-button"
          onClick={onProceedToConfirm}
          disabled={!canProceed || disabled}
          className="w-full h-11 min-h-[44px] rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{t('Tiếp tục tạo bản nháp')}</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
        {(!canProceed || disabled) && (
          <p className="text-[11px] text-center text-gray mt-1">
            {t('* Vui lòng bổ sung thông tin còn thiếu và tích chọn xác nhận ở trên')}
          </p>
        )}
      </div>
    </div>
  );
}
