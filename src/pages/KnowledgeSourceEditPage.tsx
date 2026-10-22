import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import { useToast } from '../hooks/useToast';
import { getRevision, saveRevision, parseGovernanceError } from '../api/governance';
import type { KnowledgeMetadata, KnowledgeChunk, RevisionResponse } from '../types/governance';
import KnowledgeMetadataForm from '../components/knowledge/KnowledgeMetadataForm';
import KnowledgeChunkEditor from '../components/knowledge/KnowledgeChunkEditor';
import KnowledgeStatusBadge from '../components/knowledge/KnowledgeStatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function KnowledgeSourceEditPage() {
  useLanguage();
  const { sourceId, revisionId } = useParams<{ sourceId: string; revisionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useExpertProfile();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(Boolean(revisionId));
  const [loadError, setLoadError] = useState<string | null>(revisionId ? null : 'Không tìm thấy mã phiên bản.');
  const [initialRevision, setInitialRevision] = useState<RevisionResponse | null>(null);

  const [metadata, setMetadata] = useState<KnowledgeMetadata | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [capturedVersion, setCapturedVersion] = useState<number | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Unsaved changes beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load initial revision data
  useEffect(() => {
    if (!revisionId) return;

    getRevision(revisionId)
      .then(rev => {
        setInitialRevision(rev);
        setCapturedVersion(rev.version);
        setMetadata(rev.metadata);
        setChunks(
          rev.chunks.map(c => ({
            chunkId: c.chunkId,
            title: c.title,
            topic: c.topic,
            stage: c.stage,
            content: c.content,
            originalExcerpt: c.originalExcerpt,
            locator: c.locator,
            applicabilityNotes: c.applicabilityNotes,
            measurementNotes: c.measurementNotes,
          }))
        );
        setLoading(false);
      })
      .catch(err => {
        const parsed = parseGovernanceError(err, 'Không thể tải phiên bản nguồn tri thức.');
        setLoadError(parsed.message);
        setLoading(false);
      });
  }, [revisionId]);

  const handleMetadataChange = (updater: (prev: KnowledgeMetadata) => KnowledgeMetadata) => {
    setIsDirty(true);
    setMetadata(prev => (prev ? updater(prev) : prev));
  };

  const handleChunksChange = (updater: (prev: KnowledgeChunk[]) => KnowledgeChunk[]) => {
    setIsDirty(true);
    setChunks(updater);
  };

  // Reload handler when 409 conflict happens
  const handleReloadAndReview = async () => {
    if (!revisionId) return;
    setIsReloading(true);
    try {
      const updatedRev = await getRevision(revisionId);
      setInitialRevision(updatedRev);
      setCapturedVersion(updatedRev.version);
      setConflictError(null);
      showSuccess(t('Đã tải lại phiên bản mới nhất từ máy chủ (v{0}). Bạn có thể tiếp tục chỉnh sửa.', [updatedRev.version]));
    } catch (err) {
      const parsed = parseGovernanceError(err, 'Không thể tải lại phiên bản.');
      showError(parsed.message);
    } finally {
      setIsReloading(false);
    }
  };

  const validate = (): boolean => {
    if (!metadata) return false;
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
    if (!revisionId || !metadata || capturedVersion === null) return;
    setGeneralError(null);
    setConflictError(null);

    if (!validate()) {
      showError(t('Vui lòng kiểm tra và sửa các lỗi trên biểu mẫu.'));
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await saveRevision(revisionId, {
        version: capturedVersion,
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
          stage: c.stage, // explicitly nullable
          content: c.content || '',
          originalExcerpt: c.originalExcerpt || '',
          locator: c.locator || '',
          applicabilityNotes: c.applicabilityNotes?.trim() || null,
          measurementNotes: c.measurementNotes?.trim() || null,
        })),
      });

      showSuccess(t('Lưu bản nháp thành công! (v{0})', [updated.version]));
      setIsDirty(false);
      navigate(`/knowledge/sources/${sourceId}`);
    } catch (err) {
      const parsed = parseGovernanceError(err, 'Không thể lưu bản nháp.');
      if (parsed.status === 409) {
        setConflictError(
          t('Hồ sơ đã được cập nhật bởi một phiên làm việc khác. Dữ liệu bạn vừa nhập đã được giữ lại trên màn hình. Vui lòng nhấn "Tải lại và cập nhật phiên bản" bên dưới trước khi lưu tiếp.')
        );
      } else if (parsed.status === 403) {
        setGeneralError(
          user?.role === 'ADMIN'
            ? 'Bạn không có quyền lưu bản nháp này vì máy chủ chỉ cho phép người tạo hồ sơ chỉnh sửa (403 Forbidden).'
            : parsed.message
        );
      } else {
        setGeneralError(parsed.message);
      }
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFieldErrors(parsed.fieldErrors);
      }
      showError(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRestrictedExpert =
    user?.role === 'EXPERT' &&
    !profileLoading &&
    profile &&
    profile.verificationStatus !== 'VERIFIED';

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;
  if (!initialRevision || !metadata) {
    return <ErrorState message={t('Không tìm thấy thông tin phiên bản.')} onRetry={() => window.location.reload()} />;
  }

  // Check if revision is DRAFT
  if (initialRevision.status !== 'DRAFT') {
    return (
      <div
        data-testid="revision-locked-banner"
        className="py-12 text-center rounded-2xl border border-border bg-surface p-6 shadow-2xs space-y-4"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-amber text-4xl">
          lock
        </span>
        <h2 className="text-lg font-bold text-text">
          {t('Chỉ có thể chỉnh sửa hồ sơ ở trạng thái Bản nháp (DRAFT)')}
        </h2>
        <p className="text-xs text-gray max-w-md mx-auto leading-relaxed">
          {t(
            'Phiên bản này hiện đang ở trạng thái "{0}" và nội dung đã được chốt snapshot bất biến để phục vụ quy trình thẩm định.',
            [t(initialRevision.status)]
          )}
        </p>
        <Link
          to={`/knowledge/sources/${sourceId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy text-surface dark:text-bg text-xs font-semibold"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            arrow_back
          </span>
          <span>{t('Xem chi tiết hồ sơ nguồn')}</span>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link
            to={`/knowledge/sources/${sourceId}`}
            onClick={e => {
              if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi?'))) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray hover:text-text mb-2 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              arrow_back
            </span>
            <span>{t('Quay lại chi tiết nguồn')}</span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-text">{t('Chỉnh sửa bản nháp')}</h1>
            <KnowledgeStatusBadge status="DRAFT" size="sm" />
            <span className="text-xs font-mono text-gray">
              Rev #{initialRevision.revisionNumber} (v{capturedVersion})
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-gray">
            {t('Cập nhật thông tin tài liệu và danh sách đoạn trích. Sử dụng cơ chế khóa lạc quan (optimistic locking) để tránh ghi đè dữ liệu.')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            to={`/knowledge/sources/${sourceId}`}
            onClick={e => {
              if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
                e.preventDefault();
              }
            }}
            className="min-h-11 px-4 py-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg transition-colors"
          >
            {t('Hủy')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(conflictError) || Boolean(isRestrictedExpert)}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-xs font-semibold text-surface dark:text-bg hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs transition-opacity"
          >
            {isSubmitting && (
              <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
            )}
            <span>{t(isSubmitting ? 'Đang lưu bản nháp...' : 'Lưu thay đổi')}</span>
          </button>
        </div>
      </div>

      {/* Admin Ownership Policy Notice */}
      {user?.role === 'ADMIN' && (
        <div
          role="note"
          data-testid="admin-edit-notice"
          className="flex items-start gap-2.5 rounded-2xl border border-blue/20 bg-blue/5 p-4 text-xs text-text shadow-2xs"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-blue text-lg shrink-0 mt-0.5">
            info
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-text">
              {t('Quyền chỉnh sửa của Quản trị viên')}
            </p>
            <p className="text-gray leading-relaxed">
              {t(
                'Máy chủ áp dụng cơ chế kiểm soát sở hữu nghiêm ngặt: chỉ tài khoản đã tạo bản nháp này mới có thể lưu thay đổi. Nếu hồ sơ do người dùng khác tạo, thao tác lưu sẽ bị từ chối (403 Forbidden).'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Restricted Expert Notice */}
      {isRestrictedExpert && (
        <div
          role="alert"
          data-testid="restricted-expert-edit-banner"
          className="flex items-start gap-2.5 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-xs text-text shadow-2xs"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-amber text-lg shrink-0 mt-0.5">
            lock
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-text">
              {profile?.verificationStatus === 'PENDING'
                ? t('Tài khoản của bạn đang chờ quản trị viên xác minh.')
                : t('Quyền chuyên môn của tài khoản đang tạm đình chỉ.')}
            </p>
            <p className="text-gray leading-relaxed">
              {t('Bạn không thể lưu bản nháp khi hồ sơ chuyên gia chưa được xác minh.')}
            </p>
          </div>
        </div>
      )}

      {/* 409 Conflict Banner with Reload Action */}
      {conflictError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber/40 bg-amber/10 p-4 md:p-5 text-xs text-text space-y-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5">
            <span aria-hidden="true" className="material-symbols-outlined text-amber shrink-0 text-xl">
              warning
            </span>
            <div className="space-y-1">
              <p className="font-bold text-amber">{t('Xung đột phiên bản (409 Conflict)')}</p>
              <p className="text-gray leading-relaxed">{conflictError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isReloading}
              onClick={handleReloadAndReview}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface border border-border px-3.5 font-semibold text-text hover:bg-bg disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <span className={`material-symbols-outlined text-sm ${isReloading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{t(isReloading ? 'Đang tải lại...' : 'Tải lại và cập nhật phiên bản')}</span>
            </button>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          data-testid="governance-error-banner"
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
        onChange={handleMetadataChange}
        fieldErrors={fieldErrors}
        disabled={isSubmitting}
      />

      {/* Chunks Editor Section */}
      <KnowledgeChunkEditor
        chunks={chunks}
        onChange={handleChunksChange}
        fieldErrors={fieldErrors}
        disabled={isSubmitting}
      />

      {/* Bottom Save Action */}
      <div className="flex justify-end gap-2.5 pt-2">
        <Link
          to={`/knowledge/sources/${sourceId}`}
          onClick={e => {
            if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
              e.preventDefault();
            }
          }}
          className="min-h-11 px-4 py-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg transition-colors"
        >
          {t('Hủy')}
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || Boolean(conflictError) || Boolean(isRestrictedExpert)}
          className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-xs font-semibold text-surface dark:text-bg hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs transition-opacity"
        >
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
          )}
          <span>{t(isSubmitting ? 'Đang lưu bản nháp...' : 'Lưu thay đổi')}</span>
        </button>
      </div>
    </form>
  );
}
