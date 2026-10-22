import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import { useKnowledgeSourceDetail } from '../hooks/useKnowledgeSourceDetail';
import { useKnowledgeHistory } from '../hooks/useKnowledgeHistory';
import KnowledgeStatusBadge from '../components/knowledge/KnowledgeStatusBadge';
import KnowledgeTierBadge from '../components/knowledge/KnowledgeTierBadge';
import KnowledgeHistoryTable from '../components/knowledge/KnowledgeHistoryTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { SOURCE_TYPE_CONFIG, TOPIC_CONFIG, GROWTH_STAGE_CONFIG } from '../utils/governanceStatus';
import { evaluateDraftEditEligibility } from '../utils/governanceAuth';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function KnowledgeSourceDetailPage() {
  useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useExpertProfile();

  const [activeTab, setActiveTab] = useState<'chunks' | 'history'>('chunks');

  const { source, revision, loading, error, notFound, reload } = useKnowledgeSourceDetail(id);
  const {
    data: historyData,
    loading: historyLoading,
    page: historyPage,
    setPage: setHistoryPage,
  } = useKnowledgeHistory(id);

  if (loading) return <LoadingState />;
  if (notFound) {
    return (
      <div className="py-16 text-center rounded-2xl border border-border bg-surface p-6 shadow-2xs space-y-4">
        <span aria-hidden="true" className="material-symbols-outlined text-gray text-4xl">
          search_off
        </span>
        <h2 className="text-lg font-bold text-text">{t('Không tìm thấy nguồn tri thức')}</h2>
        <p className="text-xs text-gray max-w-md mx-auto">
          {t('Hồ sơ không tồn tại hoặc bạn không có quyền truy cập vào nguồn tri thức này.')}
        </p>
        <Link
          to="/knowledge/sources"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy text-surface dark:text-bg text-xs font-semibold"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            arrow_back
          </span>
          <span>{t('Quay lại danh sách')}</span>
        </Link>
      </div>
    );
  }
  if (error || !source) {
    return <ErrorState message={error || t('Không thể tải thông tin nguồn tri thức.')} onRetry={reload} />;
  }

  const latestRev = revision || (source.latestRevision ? { ...source.latestRevision, metadata: null, chunks: [] } : null);
  const status = latestRev?.status || 'DRAFT';
  const meta = revision?.metadata;
  const chunks = revision?.chunks || [];

  const targetRevisionId = revision?.id || source.latestRevisionId || source.latestRevision?.id || null;

  // Evaluate draft edit eligibility following FE-003 policy:
  // - Verified EXPERT owning the draft: can edit and save
  // - ADMIN viewing a DRAFT: navigation affordance to edit workflow (backend enforces ownership on save)
  // - Non-owner EXPERT, pending/suspended EXPERT, OWNER, or non-DRAFT: cannot edit
  const eligibility = evaluateDraftEditEligibility({
    user,
    profile,
    profileLoading,
    profileError,
    status,
    sourceOwnerUserId: source.ownerUserId,
    hasValidRevision: Boolean(targetRevisionId),
  });

  const canEditDraft = eligibility.canAttemptEdit;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link
            to="/knowledge/sources"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray hover:text-text mb-2 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              arrow_back
            </span>
            <span>{t('Quay lại danh sách nguồn')}</span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-text [overflow-wrap:anywhere]">
              {meta?.title || latestRev?.title || t('Chi tiết nguồn tri thức')}
            </h1>
            <KnowledgeStatusBadge status={status} size="sm" />
            {meta?.proposedTier && (
              <KnowledgeTierBadge tier={meta.proposedTier} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray font-mono flex-wrap">
            <span>ID: {source.id}</span>
            <span>•</span>
            <span>v{source.version}</span>
            {latestRev && (
              <>
                <span>•</span>
                <span>Rev #{latestRev.revisionNumber}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={reload}
            title={t('Tải lại dữ liệu')}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              refresh
            </span>
          </button>

          {canEditDraft && targetRevisionId && (
            <Link
              to={`/knowledge/sources/${source.id}/revisions/${targetRevisionId}/edit`}
              data-testid="draft-edit-button"
              title={
                eligibility.isAdminAttempt
                  ? t('Chỉnh sửa bản nháp (Máy chủ sẽ xác thực quyền sở hữu khi lưu)')
                  : t('Chỉnh sửa bản nháp')
              }
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                edit
              </span>
              <span>{t('Chỉnh sửa bản nháp')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metadata Card */}
      <section
        aria-label={t('Thông tin xuất bản')}
        className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-2xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-lg">
              menu_book
            </span>
            <span>{t('Thông tin xuất bản & Xuất xứ')}</span>
          </h2>
          <span className="text-xs text-gray">
            {t('Người tạo')}: <strong className="text-text">{source.ownerDisplayName}</strong>
          </span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <dt className="text-gray mb-1">{t('Tác giả')}</dt>
            <dd className="font-semibold text-text [overflow-wrap:anywhere]">{meta?.authors || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Đơn vị xuất bản')}</dt>
            <dd className="font-semibold text-text [overflow-wrap:anywhere]">{meta?.publisher || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Loại nguồn')}</dt>
            <dd className="font-semibold text-text">
              {meta ? t(SOURCE_TYPE_CONFIG[meta.sourceType]) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Năm xuất bản')}</dt>
            <dd className="font-semibold text-text">{meta?.year || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Phiên bản ấn phẩm')}</dt>
            <dd className="font-semibold text-text">{meta?.edition || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Thời gian tạo')}</dt>
            <dd className="font-semibold text-text font-mono">{formatDate(source.createdAt)}</dd>
          </div>

          {meta?.sourceUrl && (
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-gray mb-1">{t('Đường dẫn trực tuyến')}</dt>
              <dd className="font-semibold text-navy dark:text-blue truncate">
                <a
                  href={meta.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-flex items-center gap-1"
                >
                  <span className="truncate">{meta.sourceUrl}</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </a>
              </dd>
            </div>
          )}

          {meta?.evidenceReference && (
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-gray mb-1">{t('Căn cứ trích dẫn / Lưu trữ hiện vật')}</dt>
              <dd className="text-text font-medium leading-relaxed [overflow-wrap:anywhere]">
                {meta.evidenceReference}
              </dd>
            </div>
          )}

          {meta?.provenanceNotes && (
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-gray mb-1">{t('Ghi chú xuất xứ & phương pháp thu thập')}</dt>
              <dd className="text-text font-medium leading-relaxed [overflow-wrap:anywhere] bg-bg/50 p-3 rounded-xl border border-border/80">
                {meta.provenanceNotes}
              </dd>
            </div>
          )}

          {meta?.proposedTier && (
            <div className="md:col-span-2 lg:col-span-3 border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <dt className="text-gray">{t('Đề xuất tầng chất lượng')}:</dt>
                <dd>
                  <KnowledgeTierBadge tier={meta.proposedTier} showDesc />
                </dd>
              </div>
              {meta.proposedTierRationale && (
                <div className="text-xs text-text bg-bg/50 p-3 rounded-xl border border-border/80 mt-2">
                  <p className="font-semibold mb-1 text-gray">{t('Căn cứ đề xuất')}:</p>
                  <p className="leading-relaxed [overflow-wrap:anywhere]">{meta.proposedTierRationale}</p>
                </div>
              )}
            </div>
          )}

          {/* Assessed Tier from Reviewer (if evaluated) */}
          {revision?.assessedTier && (
            <div className="md:col-span-2 lg:col-span-3 border-t border-border pt-3 bg-teal/5 p-3 rounded-xl border border-teal/20">
              <div className="flex items-center gap-2 mb-1.5">
                <dt className="font-semibold text-teal">{t('Tầng thẩm định được duyệt')}:</dt>
                <dd>
                  <KnowledgeTierBadge tier={revision.assessedTier} showDesc />
                </dd>
              </div>
              {revision.tierRationale && (
                <div className="text-xs text-text mt-2">
                  <p className="font-semibold mb-1 text-gray">{t('Đánh giá của thẩm định viên')}:</p>
                  <p className="leading-relaxed [overflow-wrap:anywhere]">{revision.tierRationale}</p>
                </div>
              )}
            </div>
          )}
        </dl>
      </section>

      {/* Main Tabs (Chunks vs Audit History) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('chunks')}
            className={`pb-3 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'chunks'
                ? 'border-navy text-navy dark:border-blue dark:text-blue'
                : 'border-transparent text-gray hover:text-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                segment
              </span>
              <span>{t('Các đoạn trích kiến thức')}</span>
              <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy dark:bg-blue/15 dark:text-blue text-[11px] font-bold">
                {chunks.length}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'border-navy text-navy dark:border-blue dark:text-blue'
                : 'border-transparent text-gray hover:text-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                history
              </span>
              <span>{t('Lịch sử kiểm toán')}</span>
              {historyData && (
                <span className="px-2 py-0.5 rounded-full bg-border text-gray text-[11px] font-bold">
                  {historyData.totalElements}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Chunks Tab Content */}
        {activeTab === 'chunks' && (
          <div className="space-y-4">
            {chunks.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-surface p-6 shadow-2xs">
                <span aria-hidden="true" className="material-symbols-outlined text-gray text-3xl">
                  post_add
                </span>
                <p className="mt-2 text-xs text-gray">{t('Bản nháp này chưa có đoạn trích kiến thức nào.')}</p>
                {canEditDraft && targetRevisionId && (
                  <Link
                    to={`/knowledge/sources/${source.id}/revisions/${targetRevisionId}/edit`}
                    data-testid="draft-add-chunk-button"
                    title={
                      eligibility.isAdminAttempt
                        ? t('Thêm đoạn trích (Máy chủ sẽ xác thực quyền sở hữu khi lưu)')
                        : t('Thêm đoạn trích')
                    }
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal text-surface dark:text-bg text-xs font-semibold"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">
                      add
                    </span>
                    <span>{t('Thêm đoạn trích')}</span>
                  </Link>
                )}
              </div>
            ) : (
              chunks.map((c, idx) => (
                <div
                  key={c.chunkId || `chunk-${idx}`}
                  className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-2xs space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-navy text-surface dark:text-bg text-xs font-bold flex items-center justify-center shrink-0">
                        {c.position + 1}
                      </span>
                      <h3 className="font-bold text-sm text-text [overflow-wrap:anywhere]">{c.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md border border-teal/30 bg-teal/10 text-teal text-[11px] font-semibold">
                        {t(TOPIC_CONFIG[c.topic])}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md border border-border bg-bg text-gray text-[11px] font-medium">
                        {c.stage ? t(GROWTH_STAGE_CONFIG[c.stage]) : t('Áp dụng chung')}
                      </span>
                      {c.locator && (
                        <span className="text-[11px] font-mono text-gray">
                          📍 {c.locator}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Original Excerpt */}
                  {c.originalExcerpt && (
                    <div className="rounded-xl border border-border/70 bg-bg/50 p-3.5 text-xs text-text space-y-1">
                      <span className="font-semibold text-gray text-[11px] block">
                        {t('Trích đoạn nguyên văn')}:
                      </span>
                      <p className="italic leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                        "{c.originalExcerpt}"
                      </p>
                    </div>
                  )}

                  {/* Content / Guidance */}
                  {c.content && (
                    <div className="text-xs text-text space-y-1">
                      <span className="font-semibold text-gray text-[11px] block">
                        {t('Nội dung chuẩn hóa / Hướng dẫn')}:
                      </span>
                      <p className="leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {c.content}
                      </p>
                    </div>
                  )}

                  {/* Notes Grid */}
                  {(c.applicabilityNotes || c.measurementNotes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] text-gray border-t border-border/60">
                      {c.applicabilityNotes && (
                        <div>
                          <strong className="text-text block mb-0.5">{t('Phạm vi áp dụng')}:</strong>
                          <p className="[overflow-wrap:anywhere]">{c.applicabilityNotes}</p>
                        </div>
                      )}
                      {c.measurementNotes && (
                        <div>
                          <strong className="text-text block mb-0.5">{t('Ghi chú đo lường')}:</strong>
                          <p className="[overflow-wrap:anywhere]">{c.measurementNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <KnowledgeHistoryTable
              events={historyData?.content || []}
              loading={historyLoading}
            />

            {historyData && historyData.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-gray pt-2">
                <span>
                  {t('Tổng số')}: {historyData.totalElements} {t('sự kiện')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={historyPage <= 0}
                    onClick={() => setHistoryPage(historyPage - 1)}
                    className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
                  >
                    {t('Trước')}
                  </button>
                  <span className="font-medium text-text px-1">
                    {historyPage + 1} / {historyData.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={historyPage >= historyData.totalPages - 1}
                    onClick={() => setHistoryPage(historyPage + 1)}
                    className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
                  >
                    {t('Sau')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
