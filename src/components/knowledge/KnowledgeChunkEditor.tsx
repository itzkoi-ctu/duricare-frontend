import { useState } from 'react';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { KnowledgeChunk, Topic, GrowthStage } from '../../types/governance';
import { TOPIC_CONFIG, GROWTH_STAGE_CONFIG } from '../../utils/governanceStatus';

interface KnowledgeChunkEditorProps {
  chunks: KnowledgeChunk[];
  onChange: (updater: (prev: KnowledgeChunk[]) => KnowledgeChunk[]) => void;
  fieldErrors: Record<string, string>;
  disabled?: boolean;
}

export default function KnowledgeChunkEditor({
  chunks,
  onChange,
  fieldErrors,
  disabled = false,
}: KnowledgeChunkEditorProps) {
  useLanguage();

  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  const toggleCollapse = (index: number) => {
    setCollapsedMap(prev => {
      const current = prev[index] !== undefined ? prev[index] : index !== 0;
      return { ...prev, [index]: !current };
    });
  };

  const handleAddChunk = () => {
    if (chunks.length >= 20 || disabled) return;
    const newChunk: KnowledgeChunk = {
      chunkId: null,
      title: '',
      topic: 'GENERAL',
      stage: null,
      content: '',
      originalExcerpt: '',
      locator: '',
      applicabilityNotes: null,
      measurementNotes: null,
    };
    const newIndex = chunks.length;
    onChange(prev => [...prev, newChunk]);
    // Ensure newly added chunk is expanded for immediate editing
    setCollapsedMap(prev => ({ ...prev, [newIndex]: false }));
  };

  const handleRemoveChunk = (index: number) => {
    if (disabled) return;
    onChange(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || disabled) return;
    onChange(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
    setCollapsedMap(prev => {
      const next = { ...prev };
      const curVal = prev[index];
      const prevVal = prev[index - 1];
      next[index - 1] = curVal !== undefined ? curVal : index !== 0;
      next[index] = prevVal !== undefined ? prevVal : (index - 1) !== 0;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === chunks.length - 1 || disabled) return;
    onChange(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
    setCollapsedMap(prev => {
      const next = { ...prev };
      const curVal = prev[index];
      const nextVal = prev[index + 1];
      next[index + 1] = curVal !== undefined ? curVal : index !== 0;
      next[index] = nextVal !== undefined ? nextVal : (index + 1) !== 0;
      return next;
    });
  };

  const updateChunk = <K extends keyof KnowledgeChunk>(
    index: number,
    field: K,
    value: KnowledgeChunk[K]
  ) => {
    onChange(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">
            {t('Danh sách đoạn trích nội dung ({0} đoạn)', [chunks.length])}
          </h2>
          <p className="text-xs text-gray mt-0.5">
            {t('Mỗi đoạn trích tương ứng một đơn vị kiến thức độc lập trong cơ sở dữ liệu RAG. Tối đa 20 đoạn.')}
          </p>
        </div>

        <button
          type="button"
          disabled={chunks.length >= 20 || disabled}
          onClick={handleAddChunk}
          className="h-11 min-h-[44px] px-4 rounded-lg border border-primary text-primary hover:bg-primary/5 text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            add
          </span>
          <span>{t('Thêm đoạn trích')}</span>
        </button>
      </div>

      {fieldErrors['chunks'] && (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {t(fieldErrors['chunks'])}
        </p>
      )}

      {chunks.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed border-border bg-surface dark:bg-bg/50 p-6 space-y-3">
          <span aria-hidden="true" className="material-symbols-outlined text-gray text-4xl">
            post_add
          </span>
          <p className="text-xs text-gray max-w-sm mx-auto">
            {t('Chưa có đoạn kiến thức nào. Bạn có thể thêm đoạn trích đầu tiên để bắt đầu.')}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddChunk}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              add
            </span>
            <span>{t('Thêm đoạn đầu tiên')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {chunks.map((chunk, idx) => {
            const prefix = `chunks[${idx}].`;
            const chunkHasError = Object.keys(fieldErrors).some(k => k.startsWith(prefix));
            const isCollapsed = chunkHasError
              ? false
              : collapsedMap[idx] !== undefined
              ? collapsedMap[idx]
              : idx !== 0;

            if (isCollapsed) {
              return (
                <div
                  key={chunk.chunkId || `chunk-${idx}`}
                  id={`chunk-${idx + 1}`}
                  data-testid={`chunk-item-${idx}`}
                  className="bg-surface border border-border rounded-xl p-3.5 shadow-xs transition hover:border-border/80 scroll-mt-28"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(idx)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                      title={t('Nhấn để mở rộng & chỉnh sửa chi tiết')}
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-bg text-gray text-xs font-semibold flex items-center justify-center shrink-0 group-hover:bg-[#1f5ca9] group-hover:text-white transition-colors">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-text truncate group-hover:text-primary transition-colors">
                          {t('Đoạn {0}', [idx + 1])} — {chunk.title || t('(Chưa có tiêu đề)')}
                        </div>
                        <div className="text-[11px] text-gray truncate mt-0.5">
                          {chunk.locator ? `${t('Vị trí:')} ${chunk.locator}` : t('Chưa có vị trí')} · {t('Chủ đề:')} {t(TOPIC_CONFIG[chunk.topic] || chunk.topic)}
                          {chunk.stage ? ` · ${t(GROWTH_STAGE_CONFIG[chunk.stage] || chunk.stage)}` : ''}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0 || disabled}
                        onClick={() => handleMoveUp(idx)}
                        title={t('Di chuyển lên')}
                        aria-label={t('Di chuyển lên')}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-gray hover:bg-surface-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                          arrow_upward
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === chunks.length - 1 || disabled}
                        onClick={() => handleMoveDown(idx)}
                        title={t('Di chuyển xuống')}
                        aria-label={t('Di chuyển xuống')}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-gray hover:bg-surface-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                          arrow_downward
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCollapse(idx)}
                        title={t('Mở rộng để chỉnh sửa')}
                        aria-label={t('Mở rộng để chỉnh sửa')}
                        className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border text-xs font-semibold text-primary bg-surface hover:bg-surface-hover transition cursor-pointer flex items-center gap-1"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">
                          edit
                        </span>
                        <span>{t('Sửa')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleRemoveChunk(idx)}
                        title={t('Xóa đoạn trích')}
                        aria-label={t('Xóa đoạn trích')}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={chunk.chunkId || `chunk-${idx}`}
                id={`chunk-${idx + 1}`}
                data-testid={`chunk-item-${idx}`}
                className="bg-surface border-2 border-primary/40 rounded-xl p-4 md:p-6 shadow-sm space-y-4 relative scroll-mt-28"
              >
                {/* Chunk Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border bg-blue-50/40 dark:bg-blue-950/20 -mx-4 md:-mx-6 -mt-4 md:-mt-6 p-3.5 md:p-4 rounded-t-xl">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-md bg-[#1f5ca9] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm md:text-base font-semibold text-text break-words">
                        {chunk.title || `${t('Đoạn')} ${idx + 1}`}
                      </span>
                      <span className="shrink-0 whitespace-nowrap h-6 px-2 rounded-[6px] text-xs font-semibold leading-none bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center">
                        {t('Đang biên tập')}
                      </span>
                      {chunk.chunkId && (
                        <span className="text-[10px] font-mono text-gray px-1.5 py-0.5 rounded bg-slate-100 dark:bg-bg border border-border hidden sm:inline-block">
                          ID: {chunk.chunkId.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={idx === 0 || disabled}
                      onClick={() => handleMoveUp(idx)}
                      title={t('Di chuyển lên')}
                      aria-label={t('Di chuyển lên')}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-gray hover:bg-surface-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                        arrow_upward
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={idx === chunks.length - 1 || disabled}
                      onClick={() => handleMoveDown(idx)}
                      title={t('Di chuyển xuống')}
                      aria-label={t('Di chuyển xuống')}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-gray hover:bg-surface-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                        arrow_downward
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(idx)}
                      title={t('Thu gọn đoạn trích')}
                      aria-label={t('Thu gọn đoạn trích')}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-gray hover:bg-surface-hover hover:text-text transition cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                        expand_less
                      </span>
                    </button>
                    <div className="h-5 w-px bg-border mx-1" />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRemoveChunk(idx)}
                      title={t('Xóa đoạn trích')}
                      aria-label={t('Xóa đoạn trích')}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4 pt-1">
                  {/* Title */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor={`chunk-title-${idx}`} className="text-xs font-semibold text-text">
                        {t('Tiêu đề đoạn trích')} <span className="text-red-600">*</span>
                      </label>
                      <span className="text-xs text-gray tabular-nums">
                        {chunk.title.length}/200 {t('ký tự')}
                      </span>
                    </div>
                    <input
                      id={`chunk-title-${idx}`}
                      type="text"
                      maxLength={200}
                      disabled={disabled}
                      placeholder={t('Ví dụ: Định mức tưới giai đoạn xiết nước...')}
                      value={chunk.title}
                      onChange={e => updateChunk(idx, 'title', e.target.value)}
                      className="w-full h-11 px-3.5 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                      aria-invalid={Boolean(fieldErrors[`${prefix}title`])}
                    />
                    {fieldErrors[`${prefix}title`] && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {t(fieldErrors[`${prefix}title`])}
                      </p>
                    )}
                  </div>

                  {/* Topic & Stage */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`chunk-topic-${idx}`} className="block text-xs font-semibold text-text mb-1.5">
                        {t('Chủ đề')} <span className="text-red-600">*</span>
                      </label>
                      <select
                        id={`chunk-topic-${idx}`}
                        disabled={disabled}
                        value={chunk.topic}
                        onChange={e => updateChunk(idx, 'topic', e.target.value as Topic)}
                        className="w-full h-11 px-3.5 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                        aria-invalid={Boolean(fieldErrors[`${prefix}topic`])}
                      >
                        {Object.entries(TOPIC_CONFIG).map(([value, label]) => (
                          <option key={value} value={value}>
                            {t(label)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors[`${prefix}topic`] && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {t(fieldErrors[`${prefix}topic`])}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`chunk-stage-${idx}`} className="block text-xs font-semibold text-text mb-1.5">
                        {t('Giai đoạn sinh trưởng áp dụng')}
                      </label>
                      <select
                        id={`chunk-stage-${idx}`}
                        disabled={disabled}
                        value={chunk.stage ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateChunk(idx, 'stage', val ? (val as GrowthStage) : null);
                        }}
                        className="w-full h-11 px-3.5 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                        aria-invalid={Boolean(fieldErrors[`${prefix}stage`])}
                      >
                        <option value="">{t('Tất cả các giai đoạn / Áp dụng chung')}</option>
                        {Object.entries(GROWTH_STAGE_CONFIG).map(([value, label]) => (
                          <option key={value} value={value}>
                            {t(label)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors[`${prefix}stage`] && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {t(fieldErrors[`${prefix}stage`])}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Locator */}
                  <div>
                    <label htmlFor={`chunk-locator-${idx}`} className="block text-xs font-semibold text-text mb-1.5">
                      {t('Vị trí trích đoạn trong tài liệu (Locator)')}
                    </label>
                    <input
                      id={`chunk-locator-${idx}`}
                      type="text"
                      maxLength={500}
                      disabled={disabled}
                      placeholder={t('Ví dụ: Mục 1.6.1 · Trang 24')}
                      value={chunk.locator}
                      onChange={e => updateChunk(idx, 'locator', e.target.value)}
                      className="w-full h-11 px-3.5 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                      aria-invalid={Boolean(fieldErrors[`${prefix}locator`])}
                    />
                    {fieldErrors[`${prefix}locator`] && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {t(fieldErrors[`${prefix}locator`])}
                      </p>
                    )}
                  </div>

                  {/* Original Excerpt */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor={`chunk-excerpt-${idx}`} className="text-xs font-semibold text-text">
                        {t('Văn bản trích đoạn nguyên gốc (Original Excerpt)')}
                      </label>
                      <span className="text-xs text-gray tabular-nums">
                        {chunk.originalExcerpt.length}/12000 {t('ký tự')}
                      </span>
                    </div>
                    <textarea
                      id={`chunk-excerpt-${idx}`}
                      rows={3}
                      maxLength={12000}
                      disabled={disabled}
                      placeholder={t('Đoạn văn trích dẫn nguyên văn từ tài liệu nguồn...')}
                      value={chunk.originalExcerpt}
                      onChange={e => updateChunk(idx, 'originalExcerpt', e.target.value)}
                      className="w-full p-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60 resize-y"
                      aria-invalid={Boolean(fieldErrors[`${prefix}originalExcerpt`])}
                    />
                    {fieldErrors[`${prefix}originalExcerpt`] && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {t(fieldErrors[`${prefix}originalExcerpt`])}
                      </p>
                    )}
                  </div>

                  {/* Content (Guidance / Instruction) */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor={`chunk-content-${idx}`} className="text-xs font-semibold text-text">
                        {t('Nội dung chuẩn hóa / Hướng dẫn trích xuất (Content)')}
                      </label>
                      <span className="text-xs text-gray tabular-nums">
                        {chunk.content.length}/8000 {t('ký tự')}
                      </span>
                    </div>
                    <textarea
                      id={`chunk-content-${idx}`}
                      rows={4}
                      maxLength={8000}
                      disabled={disabled}
                      placeholder={t('Nội dung khuyến nghị kỹ thuật đã chuẩn hóa phục vụ tra cứu...')}
                      value={chunk.content}
                      onChange={e => updateChunk(idx, 'content', e.target.value)}
                      className="w-full p-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60 resize-y"
                      aria-invalid={Boolean(fieldErrors[`${prefix}content`])}
                    />
                    {fieldErrors[`${prefix}content`] && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {t(fieldErrors[`${prefix}content`])}
                      </p>
                    )}
                  </div>

                  {/* Applicability Notes & Measurement Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`chunk-applicability-${idx}`} className="block text-xs font-semibold text-text mb-1.5">
                        {t('Ghi chú phạm vi áp dụng (Đất, giống, vùng...)')}
                      </label>
                      <textarea
                        id={`chunk-applicability-${idx}`}
                        rows={2}
                        maxLength={4000}
                        disabled={disabled}
                        placeholder={t('Áp dụng cho giống Ri6, Monthong, đất phù sa ĐBSCL...')}
                        value={chunk.applicabilityNotes || ''}
                        onChange={e => updateChunk(idx, 'applicabilityNotes', e.target.value || null)}
                        className="w-full p-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60 resize-y"
                        aria-invalid={Boolean(fieldErrors[`${prefix}applicabilityNotes`])}
                      />
                      {fieldErrors[`${prefix}applicabilityNotes`] && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {t(fieldErrors[`${prefix}applicabilityNotes`])}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`chunk-measurement-${idx}`} className="block text-xs font-semibold text-text mb-1.5">
                        {t('Ghi chú phương pháp & đơn vị đo lường')}
                      </label>
                      <textarea
                        id={`chunk-measurement-${idx}`}
                        rows={2}
                        maxLength={4000}
                        disabled={disabled}
                        placeholder={t('Đo bằng cảm biến điện dung, độ ẩm thể tích m3/m3 hoặc %...')}
                        value={chunk.measurementNotes || ''}
                        onChange={e => updateChunk(idx, 'measurementNotes', e.target.value || null)}
                        className="w-full p-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60 resize-y"
                        aria-invalid={Boolean(fieldErrors[`${prefix}measurementNotes`])}
                      />
                      {fieldErrors[`${prefix}measurementNotes`] && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {t(fieldErrors[`${prefix}measurementNotes`])}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
