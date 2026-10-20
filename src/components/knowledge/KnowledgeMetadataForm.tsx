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

const inputStyle =
  'min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';
const textareaStyle =
  'w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 resize-y';
const labelStyle = 'mb-1.5 block text-xs font-semibold text-text';

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

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-2xs">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-bold text-text flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-teal text-xl">
            auto_stories
          </span>
          <span>{t('Thông tin nguồn tài liệu')}</span>
        </h2>
        <p className="mt-1 text-xs text-gray">
          {t('Khai báo nguồn xuất bản, tác giả, loại tài liệu và đề xuất tầng chất lượng căn cứ.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label htmlFor="meta-title" className={labelStyle}>
            {t('Tiêu đề tài liệu / Nguồn tri thức')} <span className="text-coral">*</span>
          </label>
          <input
            id="meta-title"
            type="text"
            maxLength={300}
            disabled={disabled}
            placeholder={t('Ví dụ: Quy trình kỹ thuật quản lý nước và bón phân sầu riêng...')}
            value={metadata.title}
            onChange={e => update('title', e.target.value)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.title'])}
          />
          {fieldErrors['metadata.title'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.title'])}
            </p>
          )}
        </div>

        {/* Authors */}
        <div>
          <label htmlFor="meta-authors" className={labelStyle}>
            {t('Tác giả / Nhóm biên soạn')}
          </label>
          <input
            id="meta-authors"
            type="text"
            maxLength={1000}
            disabled={disabled}
            placeholder={t('Ví dụ: GS.TS Trần Văn A, Viện Cây ăn quả Miền Nam...')}
            value={metadata.authors || ''}
            onChange={e => update('authors', e.target.value || null)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.authors'])}
          />
          {fieldErrors['metadata.authors'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.authors'])}
            </p>
          )}
        </div>

        {/* Publisher */}
        <div>
          <label htmlFor="meta-publisher" className={labelStyle}>
            {t('Đơn vị xuất bản / Cơ quan phát hành')}
          </label>
          <input
            id="meta-publisher"
            type="text"
            maxLength={300}
            disabled={disabled}
            placeholder={t('Ví dụ: NXB Nông Nghiệp, Trung tâm Khuyến nông Quốc gia...')}
            value={metadata.publisher || ''}
            onChange={e => update('publisher', e.target.value || null)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.publisher'])}
          />
          {fieldErrors['metadata.publisher'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.publisher'])}
            </p>
          )}
        </div>

        {/* Source Type */}
        <div>
          <label htmlFor="meta-sourcetype" className={labelStyle}>
            {t('Loại nguồn')} <span className="text-coral">*</span>
          </label>
          <select
            id="meta-sourcetype"
            disabled={disabled}
            value={metadata.sourceType}
            onChange={e => update('sourceType', e.target.value as SourceType)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.sourceType'])}
          >
            {Object.entries(SOURCE_TYPE_CONFIG).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
          {fieldErrors['metadata.sourceType'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.sourceType'])}
            </p>
          )}
        </div>

        {/* Year */}
        <div>
          <label htmlFor="meta-year" className={labelStyle}>
            {t('Năm xuất bản (1000 - ' + currentYear + ')')}
          </label>
          <input
            id="meta-year"
            type="number"
            min={1000}
            max={currentYear}
            disabled={disabled}
            placeholder={t('Ví dụ: 2024 (để trống nếu không rõ)')}
            value={metadata.year ?? ''}
            onChange={e => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              update('year', Number.isFinite(val) ? val : null);
            }}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.year'])}
          />
          {fieldErrors['metadata.year'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.year'])}
            </p>
          )}
        </div>

        {/* Edition */}
        <div>
          <label htmlFor="meta-edition" className={labelStyle}>
            {t('Tái bản / Phiên bản ấn phẩm')}
          </label>
          <input
            id="meta-edition"
            type="text"
            maxLength={100}
            disabled={disabled}
            placeholder={t('Ví dụ: Tái bản lần 2, Ấn bản sửa đổi 2023...')}
            value={metadata.edition || ''}
            onChange={e => update('edition', e.target.value || null)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.edition'])}
          />
          {fieldErrors['metadata.edition'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.edition'])}
            </p>
          )}
        </div>

        {/* Source URL */}
        <div>
          <label htmlFor="meta-sourceurl" className={labelStyle}>
            {t('Đường dẫn trực tuyến (URL HTTP/HTTPS)')}
          </label>
          <input
            id="meta-sourceurl"
            type="url"
            maxLength={2048}
            disabled={disabled}
            placeholder="https://example.org/tai-lieu-ky-thuat.pdf"
            value={metadata.sourceUrl || ''}
            onChange={e => update('sourceUrl', e.target.value || null)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.sourceUrl'])}
          />
          {fieldErrors['metadata.sourceUrl'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.sourceUrl'])}
            </p>
          )}
        </div>

        {/* Evidence Reference */}
        <div className="md:col-span-2">
          <label htmlFor="meta-evidence" className={labelStyle}>
            {t('Căn cứ trích dẫn / Lưu trữ hiện vật / Hồ sơ')}
          </label>
          <input
            id="meta-evidence"
            type="text"
            maxLength={2000}
            disabled={disabled}
            placeholder={t('Ví dụ: Bản lưu thư viện ĐH Cần Thơ, mã tài liệu CTU-2023-SR01...')}
            value={metadata.evidenceReference || ''}
            onChange={e => update('evidenceReference', e.target.value || null)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.evidenceReference'])}
          />
          {fieldErrors['metadata.evidenceReference'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.evidenceReference'])}
            </p>
          )}
        </div>

        {/* Provenance Notes */}
        <div className="md:col-span-2">
          <label htmlFor="meta-provenance" className={labelStyle}>
            {t('Ghi chú xuất xứ & phương pháp thu thập')}
          </label>
          <textarea
            id="meta-provenance"
            rows={3}
            maxLength={4000}
            disabled={disabled}
            placeholder={t('Ghi chú hoàn cảnh thu thập, biên bản phỏng vấn hoặc phương pháp kiểm tra đối chiếu...')}
            value={metadata.provenanceNotes || ''}
            onChange={e => update('provenanceNotes', e.target.value || null)}
            className={textareaStyle}
            aria-invalid={Boolean(fieldErrors['metadata.provenanceNotes'])}
          />
          {fieldErrors['metadata.provenanceNotes'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.provenanceNotes'])}
            </p>
          )}
        </div>

        {/* Proposed Tier */}
        <div>
          <label htmlFor="meta-tier" className={labelStyle}>
            {t('Đề xuất tầng chất lượng')} <span className="text-coral">*</span>
          </label>
          <select
            id="meta-tier"
            disabled={disabled}
            value={metadata.proposedTier}
            onChange={e => update('proposedTier', e.target.value as Tier)}
            className={inputStyle}
            aria-invalid={Boolean(fieldErrors['metadata.proposedTier'])}
          >
            {Object.entries(TIER_CONFIG).map(([value, info]) => (
              <option key={value} value={value}>
                {t(info.label)} - {t(info.desc)}
              </option>
            ))}
          </select>
          {fieldErrors['metadata.proposedTier'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.proposedTier'])}
            </p>
          )}
        </div>

        {/* Proposed Tier Rationale */}
        <div className="md:col-span-2">
          <label htmlFor="meta-tier-rationale" className={labelStyle}>
            {t('Căn cứ đề xuất tầng tri thức')}{' '}
            {metadata.proposedTier !== 'UNKNOWN' && <span className="text-coral">*</span>}
          </label>
          <textarea
            id="meta-tier-rationale"
            rows={3}
            maxLength={4000}
            disabled={disabled}
            placeholder={t(
              'Nêu rõ xuất xứ, quy trình thẩm định hoặc hồ sơ kiểm chứng để đề xuất tầng chất lượng tương ứng...'
            )}
            value={metadata.proposedTierRationale || ''}
            onChange={e => update('proposedTierRationale', e.target.value || null)}
            className={textareaStyle}
            aria-invalid={Boolean(fieldErrors['metadata.proposedTierRationale'])}
          />
          {fieldErrors['metadata.proposedTierRationale'] && (
            <p className="mt-1 text-xs text-coral" role="alert">
              {t(fieldErrors['metadata.proposedTierRationale'])}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
