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

const inputStyle =
  'min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';
const textareaStyle =
  'w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 resize-y';
const labelStyle = 'mb-1.5 block text-xs font-semibold text-text';

export default function KnowledgeChunkEditor({
  chunks,
  onChange,
  fieldErrors,
  disabled = false,
}: KnowledgeChunkEditorProps) {
  useLanguage();

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
    onChange(prev => [...prev, newChunk]);
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
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-base font-bold text-text flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-xl">
              segment
            </span>
            <span>{t('Các đoạn kiến thức trích đoạn (Chunks)')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy dark:bg-blue/15 dark:text-blue">
              {chunks.length}/20
            </span>
          </h2>
          <p className="mt-1 text-xs text-gray">
            {t('Chia nhỏ nội dung tài liệu thành tối đa 20 đoạn trích có định vị và điều kiện áp dụng.')}
          </p>
        </div>

        <button
          type="button"
          disabled={chunks.length >= 20 || disabled}
          onClick={handleAddChunk}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-2xs transition-opacity"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            add
          </span>
          <span>{t('Thêm đoạn trích')}</span>
        </button>
      </div>

      {fieldErrors['chunks'] && (
        <p className="text-xs text-coral font-medium" role="alert">
          {t(fieldErrors['chunks'])}
        </p>
      )}

      {chunks.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-border bg-bg/50">
          <span aria-hidden="true" className="material-symbols-outlined text-gray text-3xl">
            post_add
          </span>
          <p className="mt-2 text-xs text-gray">
            {t('Chưa có đoạn kiến thức nào. Bạn có thể lưu bản nháp không có đoạn trích hoặc thêm đoạn mới.')}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddChunk}
            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:bg-bg cursor-pointer"
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
            return (
              <div
                key={chunk.chunkId || `chunk-${idx}`}
                className="rounded-xl border border-border bg-bg p-4 space-y-4 relative"
              >
                {/* Chunk Header Controls */}
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-navy text-surface dark:text-bg text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-text">
                      {chunk.title || `${t('Đoạn kiến thức')} #${idx + 1}`}
                    </span>
                    {chunk.chunkId && (
                      <span className="text-[10px] font-mono text-gray/80 px-1.5 py-0.5 rounded bg-surface border border-border/60">
                        ID: {chunk.chunkId.substring(0, 8)}...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0 || disabled}
                      onClick={() => handleMoveUp(idx)}
                      title={t('Di chuyển lên')}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-surface text-gray hover:text-text disabled:opacity-30 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-sm">
                        arrow_upward
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={idx === chunks.length - 1 || disabled}
                      onClick={() => handleMoveDown(idx)}
                      title={t('Di chuyển xuống')}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-surface text-gray hover:text-text disabled:opacity-30 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-sm">
                        arrow_downward
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRemoveChunk(idx)}
                      title={t('Xóa đoạn này')}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-coral/30 bg-surface text-coral hover:bg-coral/10 disabled:opacity-30 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label htmlFor={`chunk-title-${idx}`} className={labelStyle}>
                      {t('Tiêu đề đoạn trích')} <span className="text-coral">*</span>
                    </label>
                    <input
                      id={`chunk-title-${idx}`}
                      type="text"
                      maxLength={200}
                      disabled={disabled}
                      placeholder={t('Ví dụ: Định mức tưới giai đoạn xiết nước...')}
                      value={chunk.title}
                      onChange={e => updateChunk(idx, 'title', e.target.value)}
                      className={inputStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}title`])}
                    />
                    {fieldErrors[`${prefix}title`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}title`])}
                      </p>
                    )}
                  </div>

                  {/* Topic */}
                  <div>
                    <label htmlFor={`chunk-topic-${idx}`} className={labelStyle}>
                      {t('Chủ đề')} <span className="text-coral">*</span>
                    </label>
                    <select
                      id={`chunk-topic-${idx}`}
                      disabled={disabled}
                      value={chunk.topic}
                      onChange={e => updateChunk(idx, 'topic', e.target.value as Topic)}
                      className={inputStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}topic`])}
                    >
                      {Object.entries(TOPIC_CONFIG).map(([value, label]) => (
                        <option key={value} value={value}>
                          {t(label)}
                        </option>
                      ))}
                    </select>
                    {fieldErrors[`${prefix}topic`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}topic`])}
                      </p>
                    )}
                  </div>

                  {/* Growth Stage (Nullable, explicit null) */}
                  <div>
                    <label htmlFor={`chunk-stage-${idx}`} className={labelStyle}>
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
                      className={inputStyle}
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
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}stage`])}
                      </p>
                    )}
                  </div>

                  {/* Locator */}
                  <div className="md:col-span-2">
                    <label htmlFor={`chunk-locator-${idx}`} className={labelStyle}>
                      {t('Vị trí trích đoạn trong tài liệu (Locator)')}
                    </label>
                    <input
                      id={`chunk-locator-${idx}`}
                      type="text"
                      maxLength={500}
                      disabled={disabled}
                      placeholder={t('Ví dụ: Trang 34, Bảng 2.1, Mục 4.2.3...')}
                      value={chunk.locator}
                      onChange={e => updateChunk(idx, 'locator', e.target.value)}
                      className={inputStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}locator`])}
                    />
                    {fieldErrors[`${prefix}locator`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}locator`])}
                      </p>
                    )}
                  </div>

                  {/* Original Excerpt */}
                  <div className="md:col-span-2">
                    <label htmlFor={`chunk-excerpt-${idx}`} className={labelStyle}>
                      {t('Văn bản trích đoạn nguyên gốc (Original Excerpt)')}
                    </label>
                    <textarea
                      id={`chunk-excerpt-${idx}`}
                      rows={3}
                      maxLength={12000}
                      disabled={disabled}
                      placeholder={t('Đoạn văn trích dẫn nguyên văn từ tài liệu nguồn...')}
                      value={chunk.originalExcerpt}
                      onChange={e => updateChunk(idx, 'originalExcerpt', e.target.value)}
                      className={textareaStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}originalExcerpt`])}
                    />
                    {fieldErrors[`${prefix}originalExcerpt`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}originalExcerpt`])}
                      </p>
                    )}
                  </div>

                  {/* Content (Guidance / Instruction) */}
                  <div className="md:col-span-2">
                    <label htmlFor={`chunk-content-${idx}`} className={labelStyle}>
                      {t('Nội dung chuẩn hóa / Hướng dẫn trích xuất (Content)')}
                    </label>
                    <textarea
                      id={`chunk-content-${idx}`}
                      rows={4}
                      maxLength={8000}
                      disabled={disabled}
                      placeholder={t('Nội dung khuyến nghị kỹ thuật đã chuẩn hóa phục vụ tra cứu...')}
                      value={chunk.content}
                      onChange={e => updateChunk(idx, 'content', e.target.value)}
                      className={textareaStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}content`])}
                    />
                    {fieldErrors[`${prefix}content`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}content`])}
                      </p>
                    )}
                  </div>

                  {/* Applicability Notes */}
                  <div>
                    <label htmlFor={`chunk-applicability-${idx}`} className={labelStyle}>
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
                      className={textareaStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}applicabilityNotes`])}
                    />
                    {fieldErrors[`${prefix}applicabilityNotes`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}applicabilityNotes`])}
                      </p>
                    )}
                  </div>

                  {/* Measurement Notes */}
                  <div>
                    <label htmlFor={`chunk-measurement-${idx}`} className={labelStyle}>
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
                      className={textareaStyle}
                      aria-invalid={Boolean(fieldErrors[`${prefix}measurementNotes`])}
                    />
                    {fieldErrors[`${prefix}measurementNotes`] && (
                      <p className="mt-1 text-xs text-coral" role="alert">
                        {t(fieldErrors[`${prefix}measurementNotes`])}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
