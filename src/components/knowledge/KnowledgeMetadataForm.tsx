import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { KnowledgeMetadata, SourceType, Tier } from '../../types/governance';
import { SOURCE_TYPE_CONFIG, TIER_CONFIG } from '../../utils/governanceStatus';

interface KnowledgeMetadataFormProps {
  metadata: KnowledgeMetadata;
  onChange: (updater: (prev: KnowledgeMetadata) => KnowledgeMetadata) => void;
  fieldErrors: Record<string, string>;
  disabled?: boolean;
}

export default function KnowledgeMetadataForm({
  metadata,
  onChange,
  fieldErrors,
  disabled = false,
}: KnowledgeMetadataFormProps) {
  useLanguage();

  const update = <K extends keyof KnowledgeMetadata>(key: K, value: KnowledgeMetadata[K]) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  const currentYear = new Date().getFullYear();

  const hasExpandedErrors = Boolean(
    fieldErrors['metadata.authors'] ||
      fieldErrors['metadata.publisher'] ||
      fieldErrors['metadata.year'] ||
      fieldErrors['metadata.edition'] ||
      fieldErrors['metadata.sourceUrl'] ||
      fieldErrors['metadata.evidenceReference'] ||
      fieldErrors['metadata.provenanceNotes'] ||
      fieldErrors['metadata.proposedTier'] ||
      fieldErrors['metadata.proposedTierRationale']
  );

  return (
    <section className="bg-surface border border-border rounded-lg p-5 md:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary text-xl"
          >
            description
          </span>
          <h2 className="text-base font-semibold text-text">
            {t('Thông tin tài liệu')}
          </h2>
        </div>
        <span className="text-xs text-gray font-normal">
          {t('Các mục đánh dấu')} <span className="text-red-600 font-medium">*</span> {t('là bắt buộc')}
        </span>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="meta-title" className="text-xs font-semibold text-text">
              {t('Tiêu đề tài liệu')} <span className="text-red-600">*</span>
            </label>
            <span className="text-xs text-gray tabular-nums">
              {metadata.title.length}/300 {t('ký tự')}
            </span>
          </div>
          <input
            id="meta-title"
            type="text"
            maxLength={300}
            disabled={disabled}
            placeholder={t('Ví dụ: Quy trình kỹ thuật quản lý nước và bón phân sầu riêng...')}
            value={metadata.title}
            onChange={e => update('title', e.target.value)}
            className="w-full h-11 px-3.5 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
            aria-invalid={Boolean(fieldErrors['metadata.title'])}
          />
          {fieldErrors['metadata.title'] && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {t(fieldErrors['metadata.title'])}
            </p>
          )}
        </div>

        {/* Source Type */}
        <div>
          <label htmlFor="meta-sourcetype" className="block text-xs font-semibold text-text mb-1.5">
            {t('Loại tài liệu')} <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <select
              id="meta-sourcetype"
              disabled={disabled}
              value={metadata.sourceType}
              onChange={e => update('sourceType', e.target.value as SourceType)}
              className="w-full h-11 px-3.5 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition appearance-none disabled:opacity-60 pr-10"
              aria-invalid={Boolean(fieldErrors['metadata.sourceType'])}
            >
              {Object.entries(SOURCE_TYPE_CONFIG).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute right-3.5 top-3 pointer-events-none text-gray text-xl"
            >
              unfold_more
            </span>
          </div>
          {fieldErrors['metadata.sourceType'] && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {t(fieldErrors['metadata.sourceType'])}
            </p>
          )}
        </div>

        {/* Expandable Section: Additional publishing & provenance information */}
        <details
          open={hasExpandedErrors ? true : undefined}
          className="group pt-2 border-t border-border"
        >
          <summary className="flex items-center justify-between py-2 text-primary hover:text-primary-hover cursor-pointer list-none select-none">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[18px] group-open:rotate-90 transition-transform"
              >
                chevron_right
              </span>
              <span>{t('Thông tin xuất bản & xuất xứ bổ sung')}</span>
            </span>
            <span className="text-xs text-gray font-normal group-open:hidden">
              {t('Nhấn để bổ sung chi tiết')}
            </span>
          </summary>

          <div className="pt-4 pb-2 space-y-4">
            {/* Authors & Publisher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="meta-authors" className="block text-xs font-semibold text-text mb-1">
                  {t('Tác giả (Authors)')}
                </label>
                <input
                  id="meta-authors"
                  type="text"
                  maxLength={1000}
                  disabled={disabled}
                  placeholder={t('Ví dụ: GS. TS. Trần Văn Hổ, Viện Cây ăn quả...')}
                  value={metadata.authors || ''}
                  onChange={e => update('authors', e.target.value || null)}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.authors'])}
                />
                {fieldErrors['metadata.authors'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.authors'])}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="meta-publisher" className="block text-xs font-semibold text-text mb-1">
                  {t('Nhà xuất bản (Publisher)')}
                </label>
                <input
                  id="meta-publisher"
                  type="text"
                  maxLength={300}
                  disabled={disabled}
                  placeholder={t('Ví dụ: NXB Nông nghiệp, Trung tâm Khuyến nông...')}
                  value={metadata.publisher || ''}
                  onChange={e => update('publisher', e.target.value || null)}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.publisher'])}
                />
                {fieldErrors['metadata.publisher'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.publisher'])}
                  </p>
                )}
              </div>
            </div>

            {/* Year, Edition, Proposed Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="meta-year" className="block text-xs font-semibold text-text mb-1">
                  {t('Năm phát hành')}
                </label>
                <input
                  id="meta-year"
                  type="number"
                  min={1000}
                  max={currentYear}
                  disabled={disabled}
                  placeholder="2024"
                  value={metadata.year ?? ''}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    update('year', Number.isFinite(val) ? val : null);
                  }}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.year'])}
                />
                {fieldErrors['metadata.year'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.year'])}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="meta-edition" className="block text-xs font-semibold text-text mb-1">
                  {t('Phiên bản ấn phẩm')}
                </label>
                <input
                  id="meta-edition"
                  type="text"
                  maxLength={100}
                  disabled={disabled}
                  placeholder={t('Tái bản lần 2')}
                  value={metadata.edition || ''}
                  onChange={e => update('edition', e.target.value || null)}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.edition'])}
                />
                {fieldErrors['metadata.edition'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.edition'])}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="meta-tier" className="block text-xs font-semibold text-text mb-1">
                  {t('Tầng tri thức đề xuất')} <span className="text-red-600">*</span>
                </label>
                <select
                  id="meta-tier"
                  disabled={disabled}
                  value={metadata.proposedTier}
                  onChange={e => update('proposedTier', e.target.value as Tier)}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.proposedTier'])}
                >
                  {Object.entries(TIER_CONFIG).map(([value, info]) => (
                    <option key={value} value={value}>
                      {t(info.label)} - {t(info.desc)}
                    </option>
                  ))}
                </select>
                {fieldErrors['metadata.proposedTier'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.proposedTier'])}
                  </p>
                )}
              </div>
            </div>

            {/* Source URL */}
            <div>
              <label htmlFor="meta-sourceurl" className="block text-xs font-semibold text-text mb-1">
                {t('Đường dẫn nguồn (Source URL)')}
              </label>
              <input
                id="meta-sourceurl"
                type="url"
                maxLength={2048}
                disabled={disabled}
                placeholder="https://..."
                value={metadata.sourceUrl || ''}
                onChange={e => update('sourceUrl', e.target.value || null)}
                className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                aria-invalid={Boolean(fieldErrors['metadata.sourceUrl'])}
              />
              {fieldErrors['metadata.sourceUrl'] && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {t(fieldErrors['metadata.sourceUrl'])}
                </p>
              )}
            </div>

            {/* Evidence & Provenance Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="meta-evidence" className="block text-xs font-semibold text-text mb-1">
                  {t('Tài liệu chứng minh (Evidence Reference)')}
                </label>
                <input
                  id="meta-evidence"
                  type="text"
                  maxLength={2000}
                  disabled={disabled}
                  placeholder={t('Số hiệu văn bản / Quyết định')}
                  value={metadata.evidenceReference || ''}
                  onChange={e => update('evidenceReference', e.target.value || null)}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.evidenceReference'])}
                />
                {fieldErrors['metadata.evidenceReference'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.evidenceReference'])}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="meta-provenance" className="block text-xs font-semibold text-text mb-1">
                  {t('Ghi chú xuất xứ (Provenance Notes)')}
                </label>
                <input
                  id="meta-provenance"
                  type="text"
                  maxLength={4000}
                  disabled={disabled}
                  placeholder={t('Ghi chú thêm về xuất xứ')}
                  value={metadata.provenanceNotes || ''}
                  onChange={e => update('provenanceNotes', e.target.value || null)}
                  className="w-full h-10 px-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                  aria-invalid={Boolean(fieldErrors['metadata.provenanceNotes'])}
                />
                {fieldErrors['metadata.provenanceNotes'] && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t(fieldErrors['metadata.provenanceNotes'])}
                  </p>
                )}
              </div>
            </div>

            {/* Proposed Tier Rationale */}
            <div>
              <label htmlFor="meta-tier-rationale" className="block text-xs font-semibold text-text mb-1">
                {t('Lý do đề xuất tầng tri thức (Proposed Tier Rationale)')}{' '}
                {metadata.proposedTier !== 'UNKNOWN' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                id="meta-tier-rationale"
                rows={2}
                maxLength={4000}
                disabled={disabled}
                placeholder={t('Nêu lý do đề xuất xếp vào tầng A/B/C...')}
                value={metadata.proposedTierRationale || ''}
                onChange={e => update('proposedTierRationale', e.target.value || null)}
                className="w-full p-3 bg-surface dark:bg-bg border border-border rounded-lg text-sm text-text placeholder:text-gray focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-60"
                aria-invalid={Boolean(fieldErrors['metadata.proposedTierRationale'])}
              />
              {fieldErrors['metadata.proposedTierRationale'] && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {t(fieldErrors['metadata.proposedTierRationale'])}
                </p>
              )}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
