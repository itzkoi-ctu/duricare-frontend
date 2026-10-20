import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useToast } from '../hooks/useToast';
import { createSource, parseGovernanceError } from '../api/governance';
import type { KnowledgeMetadata, KnowledgeChunk, CreateSourceRequest } from '../types/governance';
import KnowledgeMetadataForm from '../components/knowledge/KnowledgeMetadataForm';
import KnowledgeChunkEditor from '../components/knowledge/KnowledgeChunkEditor';

const initialMetadata: KnowledgeMetadata = {
  title: '',
  authors: null,
  publisher: null,
  sourceType: 'OFFICIAL_DOCUMENT',
  year: null,
  edition: null,
  sourceUrl: null,
  evidenceReference: null,
  provenanceNotes: null,
  proposedTier: 'UNKNOWN',
  proposedTierRationale: null,
};

export default function KnowledgeSourceCreatePage() {
  useLanguage();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [metadata, setMetadata] = useState<KnowledgeMetadata>(initialMetadata);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate on client before sending to save bandwidth and improve UX
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!metadata.title.trim()) {
      errors['metadata.title'] = 'Vui lòng nhập tiêu đề tài liệu nguồn.';
    } else if (metadata.title.length > 300) {
      errors['metadata.title'] = 'Tiêu đề tối đa 300 ký tự.';
    }

    if (metadata.authors && metadata.authors.length > 1000) {
      errors['metadata.authors'] = 'Tác giả tối đa 1000 ký tự.';
    }

    if (metadata.publisher && metadata.publisher.length > 300) {
      errors['metadata.publisher'] = 'Đơn vị xuất bản tối đa 300 ký tự.';
    }

    const currentYear = new Date().getFullYear();
    if (metadata.year !== null && (metadata.year < 1000 || metadata.year > currentYear)) {
      errors['metadata.year'] = `Năm phải từ 1000 đến ${currentYear}.`;
    }

    if (metadata.sourceUrl) {
      try {
        const u = new URL(metadata.sourceUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          errors['metadata.sourceUrl'] = 'Chỉ chấp nhận URL HTTP(S) tuyệt đối.';
        }
      } catch {
        errors['metadata.sourceUrl'] = 'URL không hợp lệ. Vui lòng nhập đúng định dạng https://...';
      }
    }

    if (metadata.proposedTier !== 'UNKNOWN' && !metadata.proposedTierRationale?.trim()) {
      errors['metadata.proposedTierRationale'] = 'Vui lòng nêu căn cứ đề xuất tầng tri thức.';
    }

    if (chunks.length > 20) {
      errors['chunks'] = 'Tối đa 20 đoạn kiến thức.';
    }

    chunks.forEach((c, idx) => {
      const prefix = `chunks[${idx}].`;
      if (!c.title.trim()) {
        errors[`${prefix}title`] = 'Vui lòng nhập tiêu đề đoạn trích.';
      } else if (c.title.length > 200) {
        errors[`${prefix}title`] = 'Tiêu đề đoạn tối đa 200 ký tự.';
      }
      if (c.content && c.content.length > 8000) {
        errors[`${prefix}content`] = 'Nội dung đoạn tối đa 8000 ký tự.';
      }
      if (c.originalExcerpt && c.originalExcerpt.length > 12000) {
        errors[`${prefix}originalExcerpt`] = 'Văn bản trích đoạn tối đa 12000 ký tự.';
      }
      if (c.locator && c.locator.length > 500) {
        errors[`${prefix}locator`] = 'Vị trí trích đoạn tối đa 500 ký tự.';
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      showError(t('Vui lòng kiểm tra và sửa các lỗi trên biểu mẫu.'));
      return;
    }

    setIsSubmitting(true);

    try {
      const request: CreateSourceRequest = {
        metadata: {
          ...metadata,
          title: metadata.title.trim(),
          authors: metadata.authors?.trim() || null,
          publisher: metadata.publisher?.trim() || null,
          edition: metadata.edition?.trim() || null,
          sourceUrl: metadata.sourceUrl?.trim() || null,
          evidenceReference: metadata.evidenceReference?.trim() || null,
          provenanceNotes: metadata.provenanceNotes?.trim() || null,
          proposedTierRationale: metadata.proposedTierRationale?.trim() || null,
        },
        chunks: chunks.map(c => ({
          chunkId: c.chunkId || null,
          title: c.title.trim(),
          topic: c.topic,
          stage: c.stage, // explicitly keep null if not selected
          content: c.content || '',
          originalExcerpt: c.originalExcerpt || '',
          locator: c.locator || '',
          applicabilityNotes: c.applicabilityNotes?.trim() || null,
          measurementNotes: c.measurementNotes?.trim() || null,
        })),
      };

      const res = await createSource(request);
      showSuccess(t('Tạo nguồn tri thức mới thành công!'));
      navigate(`/knowledge/sources/${res.source.id}`);
    } catch (err) {
      const parsed = parseGovernanceError(err, 'Không thể tạo nguồn tri thức.');
      setGeneralError(parsed.message);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFieldErrors(parsed.fieldErrors);
      }
      showError(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUnsavedChanges = Boolean(metadata.title.trim()) || chunks.length > 0;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link
            to="/knowledge/sources"
            onClick={e => {
              if (hasUnsavedChanges && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi?'))) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray hover:text-text mb-2 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              arrow_back
            </span>
            <span>{t('Quay lại danh sách nguồn')}</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-text">{t('Tạo mới nguồn tri thức')}</h1>
          <p className="mt-1 text-xs md:text-sm text-gray">
            {t('Hồ sơ ban đầu sẽ được tạo ở trạng thái Bản nháp (DRAFT) để bạn hoàn thiện trước khi gửi thẩm định.')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            to="/knowledge/sources"
            onClick={e => {
              if (hasUnsavedChanges && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
                e.preventDefault();
              }
            }}
            className="min-h-11 px-4 py-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg transition-colors"
          >
            {t('Hủy')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-xs font-semibold text-surface dark:text-bg hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs transition-opacity"
          >
            {isSubmitting && (
              <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
            )}
            <span>{t(isSubmitting ? 'Đang lưu bản nháp...' : 'Lưu tạo bản nháp')}</span>
          </button>
        </div>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs text-coral"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0 mt-0.5">
            error
          </span>
          <p className="font-medium leading-relaxed">{t(generalError)}</p>
        </div>
      )}

      {/* Metadata Form Section */}
      <KnowledgeMetadataForm
        metadata={metadata}
        onChange={setMetadata}
        fieldErrors={fieldErrors}
        disabled={isSubmitting}
      />

      {/* Chunks Editor Section */}
      <KnowledgeChunkEditor
        chunks={chunks}
        onChange={setChunks}
        fieldErrors={fieldErrors}
        disabled={isSubmitting}
      />

      {/* Bottom Save Action */}
      <div className="flex justify-end gap-2.5 pt-2">
        <Link
          to="/knowledge/sources"
          onClick={e => {
            if (hasUnsavedChanges && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
              e.preventDefault();
            }
          }}
          className="min-h-11 px-4 py-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg transition-colors"
        >
          {t('Hủy')}
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-xs font-semibold text-surface dark:text-bg hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs transition-opacity"
        >
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
          )}
          <span>{t(isSubmitting ? 'Đang lưu bản nháp...' : 'Lưu tạo bản nháp')}</span>
        </button>
      </div>
    </form>
  );
}
