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
          stage: c.stage,
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
        <span aria-hidden="true" className="material-symbols-outlined text-amber-500 text-4xl">
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1f5ca9] text-white text-xs font-semibold"
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
    <form onSubmit={handleSubmit} noValidate className="max-w-[1440px] w-full mx-auto pb-12">
      {/* Back Link */}
      <Link
        to={`/knowledge/sources/${sourceId}`}
        onClick={e => {
          if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi?'))) {
            e.preventDefault();
          }
        }}
        className="text-gray hover:text-primary text-sm font-medium mb-3 inline-flex items-center gap-1.5 transition-colors"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        <span>{t('Chi tiết nguồn tri thức')}</span>
      </Link>

      {/* Page Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t('Chỉnh sửa bản nháp')}
          </h1>
          <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border inline-flex items-center">
            {t('Bản {0}', [initialRevision.revisionNumber])}
          </span>
          <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-flex items-center">
            {t('Bản nháp')}
          </span>
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{t('Có thay đổi chưa lưu')}</span>
            </span>
          )}
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/knowledge/sources/${sourceId}`}
            onClick={e => {
              if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
                e.preventDefault();
              }
            }}
            className="h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text font-medium text-sm transition-colors shadow-xs inline-flex items-center justify-center"
          >
            {t('Hủy')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(conflictError) || Boolean(isRestrictedExpert)}
            className="h-11 px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                save
              </span>
            )}
            <span>{t(isSubmitting ? 'Đang lưu bản nháp...' : 'Lưu bản nháp')}</span>
          </button>
        </div>
      </div>

      {/* Two-Column Responsive Workspace */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Main Column (8 cols on lg, 12 on mobile) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Admin Ownership Policy Notice */}
          {user?.role === 'ADMIN' && (
            <div
              role="note"
              data-testid="admin-edit-notice"
              className="flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/20 p-4 text-xs text-text shadow-2xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">
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
              className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-text shadow-2xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">
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
              className="rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 p-4 md:p-5 text-xs text-text space-y-3 shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <span aria-hidden="true" className="material-symbols-outlined text-amber-600 shrink-0 text-xl">
                  warning
                </span>
                <div className="space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300">{t('Xung đột phiên bản (409 Conflict)')}</p>
                  <p className="text-gray leading-relaxed">{conflictError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isReloading}
                  onClick={handleReloadAndReview}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface border border-border px-3.5 font-semibold text-text hover:bg-surface-hover disabled:opacity-50 cursor-pointer shadow-2xs text-xs"
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
              className="flex items-start gap-2.5 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-800 dark:text-red-200"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0 mt-0.5 text-red-600">
                error
              </span>
              <p className="font-medium leading-relaxed">{t(generalError)}</p>
            </div>
          )}

          {/* Section 1: Metadata Form */}
          <KnowledgeMetadataForm
            metadata={metadata}
            onChange={handleMetadataChange}
            fieldErrors={fieldErrors}
            disabled={isSubmitting}
          />

          {/* Section 2: Chunks Editor */}
          <KnowledgeChunkEditor
            chunks={chunks}
            onChange={handleChunksChange}
            fieldErrors={fieldErrors}
            disabled={isSubmitting}
          />

          {/* Bottom Action Buttons (Desktop) */}
          <div className="hidden lg:flex justify-end items-center gap-3 pt-4 border-t border-border">
            <Link
              to={`/knowledge/sources/${sourceId}`}
              onClick={e => {
                if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
                  e.preventDefault();
                }
              }}
              className="h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text font-medium text-sm transition-colors shadow-xs inline-flex items-center justify-center"
            >
              {t('Hủy')}
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(conflictError) || Boolean(isRestrictedExpert)}
              className="h-11 px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  save
                </span>
              )}
              <span>{t(isSubmitting ? 'Đang lưu bản nháp...' : 'Lưu bản nháp')}</span>
            </button>
          </div>

          {/* Sticky Mobile Action Bar (Above Mobile Nav, 44px Buttons, Safe Area Aware) */}
          <div className="lg:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 bg-surface/95 backdrop-blur-sm border-t border-border px-4 py-2.5 shadow-lg">
            <div className="max-w-[420px] mx-auto flex items-center justify-between gap-3">
              <Link
                to={`/knowledge/sources/${sourceId}`}
                onClick={e => {
                  if (isDirty && !window.confirm(t('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?'))) {
                    e.preventDefault();
                  }
                }}
                className="h-11 flex-1 rounded-lg border border-border text-sm font-medium text-text bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors shadow-xs"
              >
                {t('Hủy thay đổi')}
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(conflictError) || Boolean(isRestrictedExpert)}
                className="h-11 flex-1 rounded-lg bg-[#1f5ca9] text-sm font-medium text-white hover:bg-[#184988] flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    save
                  </span>
                )}
                <span>{t(isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Rail Column (4 cols on lg, sticky) */}
        <div className="col-span-12 lg:col-span-4 space-y-6 sticky top-24">
          {/* Card 1: Overview */}
          <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text">
                {t('Tổng quan bản nháp')}
              </h3>
              <span aria-hidden="true" className="material-symbols-outlined text-gray text-[18px]">
                info
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray">{t('Số đoạn trích:')}</span>
                <span className="font-semibold text-text tabular-nums">
                  {chunks.length} {t('đoạn')}{' '}
                  <span className="font-normal text-gray">{t('(tối đa 20)')}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray">{t('Trạng thái biên tập:')}</span>
                <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border inline-flex items-center">
                  {t('Bản nháp nội bộ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray">{t('Phiên bản kế thừa:')}</span>
                {initialRevision.revisionNumber <= 1 ? (
                  <span className="font-medium text-gray text-xs" data-testid="draft-inheritance-status">
                    {t('Bản nháp ban đầu')}
                  </span>
                ) : (
                  <span className="font-medium text-text text-xs" data-testid="draft-inheritance-status">
                    {t('Từ Bản {0}', [initialRevision.revisionNumber - 1])}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Table of Contents */}
          <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text">
                {t('Mục lục đoạn trích')}
              </h3>
              <span className="text-xs text-gray tabular-nums">
                {t('{0} mục', [chunks.length])}
              </span>
            </div>
            {chunks.length === 0 ? (
              <p className="text-xs text-gray italic py-2">
                {t('Chưa có đoạn trích nào.')}
              </p>
            ) : (
              <div className="space-y-1.5 text-sm max-h-[360px] overflow-y-auto pr-1">
                {chunks.map((chk, idx) => (
                  <a
                    key={chk.chunkId || `toc-${idx}`}
                    href={`#chunk-${idx + 1}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover text-text transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-xs text-gray group-hover:text-primary w-4">
                        {idx + 1}.
                      </span>
                      <span className="truncate text-xs">
                        {chk.title || `${t('Đoạn')} ${idx + 1}`}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[16px] text-gray group-hover:text-primary shrink-0"
                    >
                      unfold_more
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
