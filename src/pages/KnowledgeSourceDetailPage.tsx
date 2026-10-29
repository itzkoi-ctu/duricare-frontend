import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import { useKnowledgeSourceDetail } from '../hooks/useKnowledgeSourceDetail';
import { useKnowledgeHistory } from '../hooks/useKnowledgeHistory';
import KnowledgeStatusBadge from '../components/knowledge/KnowledgeStatusBadge';
import KnowledgeTierBadge from '../components/knowledge/KnowledgeTierBadge';
import DecisionOutcomeBadge from '../components/knowledge/DecisionOutcomeBadge';
import KnowledgeHistoryTable from '../components/knowledge/KnowledgeHistoryTable';
import KnowledgeSubmitModal from '../components/knowledge/KnowledgeSubmitModal';
import KnowledgeWithdrawModal from '../components/knowledge/KnowledgeWithdrawModal';
import KnowledgeNewRevisionModal from '../components/knowledge/KnowledgeNewRevisionModal';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { SOURCE_TYPE_CONFIG, TOPIC_CONFIG, GROWTH_STAGE_CONFIG } from '../utils/governanceStatus';
import { evaluateDraftEditEligibility, evaluateAuthorActionEligibility } from '../utils/governanceAuth';
import type { RevisionResponse, DecisionDetail } from '../types/governance';

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

  // Active author modal identity binding
  interface ActiveAuthorModal {
    type: 'submit' | 'withdraw' | 'newRevision';
    sourceId: string;
    revisionId: string;
  }
  const [activeModal, setActiveModal] = useState<ActiveAuthorModal | null>(null);

  // Uncertainty locks keyed by `${revisionId}:${action}` (e.g. `${safeRevision.id}:submit`, `${safeRevision.id}:withdraw`)
  const [indeterminateLocks, setIndeterminateLocks] = useState<Record<string, boolean>>({});

  // Guard ref for tracking active route identity to discard late callbacks
  const currentSourceIdRef = useRef<string | undefined>(id);
  currentSourceIdRef.current = id;

  const {
    source,
    revision,
    revisionsList,
    loading,
    error,
    notFound,
    reload,
    selectRevision,
    setRevisionDirectly,
  } = useKnowledgeSourceDetail(id);

  const {
    data: historyData,
    loading: historyLoading,
    page: historyPage,
    setPage: setHistoryPage,
  } = useKnowledgeHistory(id);

  // Map chunk comments by chunkId from decision if available
  const chunkCommentsMap = useMemo(() => {
    const map = new Map<string, string>();
    const decision = revision?.decision as DecisionDetail | null | undefined;
    if (decision?.chunkComments && Array.isArray(decision.chunkComments)) {
      for (const cc of decision.chunkComments) {
        if (cc.chunkId && cc.comment) {
          map.set(cc.chunkId, cc.comment);
        }
      }
    }
    return map;
  }, [revision?.decision]);

  // Invalidate/close active author modal on source or revision identity transition
  useEffect(() => {
    setActiveModal(null);
  }, [id, revision?.id]);

  const safeRevision = revision && source && revision.sourceId === source.id && source.id === id ? revision : null;
  const latestRev = safeRevision || (source?.latestRevision ? { ...source.latestRevision, metadata: null, chunks: [] } : null);
  const status = safeRevision?.status || latestRev?.status || 'DRAFT';
  const meta = safeRevision?.metadata;
  const chunks = safeRevision?.chunks || [];

  const targetRevisionId = safeRevision?.id || source?.latestRevisionId || source?.latestRevision?.id || null;

  // Evaluate draft edit eligibility following FE-003 policy
  const eligibility = evaluateDraftEditEligibility({
    user,
    profile,
    profileLoading,
    profileError,
    status,
    sourceOwnerUserId: source?.ownerUserId,
    hasValidRevision: Boolean(targetRevisionId),
  });

  const canEditDraft = eligibility.canAttemptEdit;

  // Evaluate author lifecycle action eligibility (submit, withdraw, new revision)
  const authorEligibility = evaluateAuthorActionEligibility({
    user,
    profile,
    profileLoading,
    profileError,
    sourceOwnerUserId: source?.ownerUserId,
  });

  const canPerformAuthorActions = authorEligibility.canPerformAuthorActions;

  const canSubmit = canPerformAuthorActions && status === 'DRAFT' && Boolean(safeRevision);
  const canWithdraw = canPerformAuthorActions && (status === 'SUBMITTED' || status === 'IN_REVIEW') && Boolean(safeRevision);

  const isTerminal =
    status === 'APPROVED' ||
    status === 'CHANGES_REQUESTED' ||
    status === 'REJECTED' ||
    status === 'WITHDRAWN';

  const isLatestRevision = Boolean(
    safeRevision && source?.latestRevision && safeRevision.id === source.latestRevision.id
  );

  const canCreateNextRevision = canPerformAuthorActions && isTerminal && isLatestRevision && Boolean(safeRevision);

  // Render-time eligibility and target identity verification
  const isSubmitModalOpen = Boolean(
    activeModal?.type === 'submit' &&
    activeModal.sourceId === source?.id &&
    activeModal.revisionId === safeRevision?.id &&
    canSubmit
  );

  const isWithdrawModalOpen = Boolean(
    activeModal?.type === 'withdraw' &&
    activeModal.sourceId === source?.id &&
    activeModal.revisionId === safeRevision?.id &&
    canWithdraw
  );

  const isNewRevisionModalOpen = Boolean(
    activeModal?.type === 'newRevision' &&
    activeModal.sourceId === source?.id &&
    activeModal.revisionId === safeRevision?.id &&
    canCreateNextRevision
  );

  const closeModalFor = (targetSourceId: string, targetRevisionId: string) => {
    setActiveModal((current) => {
      if (current && current.sourceId === targetSourceId && current.revisionId === targetRevisionId) {
        return null;
      }
      return current;
    });
  };

  const handleActionSuccess = (updatedRev: RevisionResponse) => {
    // Guard against late callback from previous source or route
    if (updatedRev.sourceId !== currentSourceIdRef.current) {
      return;
    }
    // Successfully completed mutation: remove indeterminate lock for this revision action
    setIndeterminateLocks((prev) => {
      const next = { ...prev };
      delete next[`${updatedRev.id}:submit`];
      delete next[`${updatedRev.id}:withdraw`];
      delete next[`${updatedRev.id}:newRev`];
      return next;
    });
    closeModalFor(updatedRev.sourceId, updatedRev.id);
    setRevisionDirectly(updatedRev);
    reload().catch(() => {});
  };

  const handleReload = async () => {
    const targetSourceId = currentSourceIdRef.current;
    const targetRevisionId = safeRevision?.id;
    const res = await reload();
    // Guard against late reload response if user navigated away while reload was in flight
    if (currentSourceIdRef.current !== targetSourceId) {
      return res;
    }
    // Successfully reloaded: clear indeterminate locks for the verified revision
    const verifiedRevId = res?.revision?.id || targetRevisionId;
    if (res?.revision && verifiedRevId) {
      setIndeterminateLocks((prev) => {
        const next = { ...prev };
        delete next[`${verifiedRevId}:submit`];
        delete next[`${verifiedRevId}:withdraw`];
        delete next[`${verifiedRevId}:newRev`];
        return next;
      });
    }
    return res;
  };

  if (loading && !source) return <LoadingState />;
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
  if (!source) {
    return <ErrorState message={error || t('Không thể tải thông tin nguồn tri thức.')} onRetry={reload} />;
  }

  const decision = revision?.decision as DecisionDetail | null | undefined;

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
            {revision && (
              <>
                <span>•</span>
                <span>Rev #{revision.revisionNumber} (v{revision.version})</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => { reload().catch(() => {}); }}
            title={t('Tải lại dữ liệu')}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              refresh
            </span>
          </button>

          {/* DRAFT Actions */}
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

          {canSubmit && safeRevision && (
            <button
              type="button"
              data-testid="submit-for-review-button"
              onClick={() =>
                setActiveModal({
                  type: 'submit',
                  sourceId: source.id,
                  revisionId: safeRevision.id,
                })
              }
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                send
              </span>
              <span>{t('Gửi thẩm định')}</span>
            </button>
          )}

          {/* SUBMITTED / IN_REVIEW Actions */}
          {canWithdraw && safeRevision && (
            <button
              type="button"
              data-testid="withdraw-button"
              onClick={() =>
                setActiveModal({
                  type: 'withdraw',
                  sourceId: source.id,
                  revisionId: safeRevision.id,
                })
              }
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coral/10 border border-coral/30 text-coral hover:bg-coral/20 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                archive
              </span>
              <span>{t('Rút hồ sơ')}</span>
            </button>
          )}

          {/* Terminal Action: Create Subsequent Revision */}
          {canCreateNextRevision && safeRevision && (
            <button
              type="button"
              data-testid="create-subsequent-revision-button"
              onClick={() =>
                setActiveModal({
                  type: 'newRevision',
                  sourceId: source.id,
                  revisionId: safeRevision.id,
                })
              }
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                post_add
              </span>
              <span>{t('Tạo phiên bản mới từ bản này')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert banner if reload failed while source was preserved */}
      {error && (
        <div
          data-testid="detail-reload-error-banner"
          className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 flex items-start justify-between gap-3 text-sm"
        >
          <div className="flex items-start gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">
              error
            </span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => { reload().catch(() => {}); }}
            className="text-xs font-semibold underline hover:no-underline shrink-0 cursor-pointer"
          >
            {t('Thử lại')}
          </button>
        </div>
      )}

      {/* Revisions Switcher */}
      {revisionsList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/70">
          <span className="text-xs font-semibold text-gray shrink-0">{t('Phiên bản')}:</span>
          {revisionsList.map(r => {
            const isSelected = revision?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                data-testid={`revision-tab-${r.revisionNumber}`}
                onClick={() => selectRevision(r.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-navy text-surface dark:text-bg shadow-xs'
                    : 'bg-surface border border-border text-gray hover:text-text hover:bg-bg'
                }`}
              >
                <span>Rev #{r.revisionNumber}</span>
                <KnowledgeStatusBadge status={r.status} size="sm" showIcon={false} />
              </button>
            );
          })}
        </div>
      )}

      {/* Informational Status Notices */}
      {status === 'SUBMITTED' && (
        <div
          data-testid="submitted-notice-banner"
          className="p-4 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              schedule
            </span>
            <span>{t('Hồ sơ đã được gửi thẩm định chuyên môn')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text/80">
            {t('Nội dung hồ sơ hiện đang ở trạng thái bất biến (chỉ đọc) và nằm trong hàng đợi phân công của quản trị viên. Tác giả có thể rút hồ sơ nếu cần bổ sung hoặc điều chỉnh.')}
          </p>
        </div>
      )}

      {status === 'IN_REVIEW' && (
        <div
          data-testid="in-review-notice-banner"
          className="p-4 rounded-xl border border-blue/30 bg-blue/10 text-blue space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              rate_review
            </span>
            <span>{t('Hồ sơ đang trong quá trình thẩm định độc lập')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text/80">
            {t('Chuyên gia được phân công đang đối chiếu tài liệu nguồn và các trích đoạn. Nội dung tiếp tục được bảo vệ bất biến.')}
          </p>
        </div>
      )}

      {status === 'APPROVED' && (
        <div
          data-testid="approved-notice-banner"
          className="p-4 rounded-xl border border-teal/30 bg-teal/10 text-teal space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              verified
            </span>
            <span>{t('Hồ sơ nguồn đã được phê duyệt thẩm định chuyên môn')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text/80">
            {t('Phiên bản này đã hoàn tất thẩm định (1B). Lưu ý: Quyết định phê duyệt là kết quả thẩm định chuyên môn, chưa đồng nghĩa với việc đã xuất bản hay chỉ mục vào hệ thống RAG.')}
          </p>
        </div>
      )}

      {status === 'CHANGES_REQUESTED' && (
        <div
          data-testid="changes-requested-notice-banner"
          className="p-4 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              feedback
            </span>
            <span>{t('Thẩm định viên yêu cầu chỉnh sửa hoặc bổ sung căn cứ')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text/80">
            {t('Vui lòng xem ý kiến thẩm định chi tiết bên dưới. Bạn có thể sử dụng nút "Tạo phiên bản mới từ bản này" để mở bản nháp Rev #{0} và hoàn thiện các yêu cầu.', [(revision?.revisionNumber || 1) + 1])}
          </p>
        </div>
      )}

      {status === 'REJECTED' && (
        <div
          data-testid="rejected-notice-banner"
          className="p-4 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              cancel
            </span>
            <span>{t('Hồ sơ đã bị từ chối thẩm định chuyên môn')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text/80">
            {t('Hồ sơ không đáp ứng các tiêu chuẩn thẩm định. Bạn có thể xem lý do đánh giá bên dưới.')}
          </p>
        </div>
      )}

      {status === 'WITHDRAWN' && (
        <div
          data-testid="withdrawn-notice-banner"
          className="p-4 rounded-xl border border-border bg-bg text-gray space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              archive
            </span>
            <span>{t('Hồ sơ đã được rút bởi tác giả')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray/80">
            {t('Phiên bản này đã bị rút và không còn nằm trong quá trình thẩm định. Bạn có thể tạo phiên bản mới tiếp theo từ bản này khi sẵn sàng.')}
          </p>
        </div>
      )}

      {/* Reviewer Decision Details Card (if decision exists) */}
      {decision && (
        <section
          data-testid="decision-detail-card"
          aria-label={t('Kết quả thẩm định')}
          className="rounded-2xl border border-teal/30 bg-surface p-5 md:p-6 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-teal text-xl">
                fact_check
              </span>
              <h2 className="text-sm font-bold text-text">{t('Quyết định thẩm định chuyên môn')}</h2>
            </div>
            <DecisionOutcomeBadge outcome={decision.outcome} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray block mb-1">{t('Thời gian thẩm định')}:</span>
              <span className="font-semibold text-text font-mono">{formatDate(decision.decidedAt)}</span>
            </div>

            {decision.assessedTier && (
              <div>
                <span className="text-gray block mb-1">{t('Tầng tri thức được xác nhận')}:</span>
                <KnowledgeTierBadge tier={decision.assessedTier} showDesc />
              </div>
            )}

            <div className="md:col-span-2">
              <span className="text-gray block mb-1 font-semibold">{t('Nhận xét & Căn cứ quyết định')}:</span>
              <div className="p-3.5 rounded-xl bg-bg border border-border text-text leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                {decision.reason}
              </div>
            </div>

            {decision.tierRationale && (
              <div className="md:col-span-2">
                <span className="text-gray block mb-1 font-semibold">{t('Căn cứ xếp tầng tri thức')}:</span>
                <div className="p-3 rounded-xl bg-bg border border-border text-text text-[11px] leading-relaxed [overflow-wrap:anywhere]">
                  {decision.tierRationale}
                </div>
              </div>
            )}

            {/* Verification checklist indicators */}
            <div className="md:col-span-2 border-t border-border pt-3">
              <span className="text-gray block mb-2 font-semibold">{t('Các tiêu chí đã thẩm định')}:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-base ${
                      decision.checkedSource ? 'text-teal' : 'text-gray/40'
                    }`}
                  >
                    {decision.checkedSource ? 'check_circle' : 'cancel'}
                  </span>
                  <span>{t('Đối chiếu tài liệu nguồn')}</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-base ${
                      decision.checkedFaithfulness ? 'text-teal' : 'text-gray/40'
                    }`}
                  >
                    {decision.checkedFaithfulness ? 'check_circle' : 'cancel'}
                  </span>
                  <span>{t('Tính trung thực trích đoạn')}</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-base ${
                      decision.checkedApplicability ? 'text-teal' : 'text-gray/40'
                    }`}
                  >
                    {decision.checkedApplicability ? 'check_circle' : 'cancel'}
                  </span>
                  <span>{t('Phạm vi áp dụng thực tế')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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
            {authorEligibility.isVerifiedOwner && (
              <span className="ml-1 text-xs text-teal font-semibold">({t('Bạn')})</span>
            )}
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
              chunks.map((c, idx) => {
                const reviewerComment = c.chunkId ? chunkCommentsMap.get(c.chunkId) : null;
                return (
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
                          {t(TOPIC_CONFIG[c.topic] || c.topic)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md border border-border bg-bg text-gray text-[11px] font-medium">
                          {c.stage ? t(GROWTH_STAGE_CONFIG[c.stage] || c.stage) : t('Áp dụng chung')}
                        </span>
                        {c.locator && (
                          <span className="text-[11px] font-mono text-gray">
                            📍 {c.locator}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reviewer Comment for this chunk (if changes requested or rejected) */}
                    {reviewerComment && (
                      <div
                        data-testid={`chunk-comment-${c.chunkId}`}
                        className="rounded-xl border border-amber/40 bg-amber/10 p-3 text-xs text-amber space-y-1"
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <span aria-hidden="true" className="material-symbols-outlined text-sm">
                            rate_review
                          </span>
                          <span>{t('Góp ý của thẩm định viên')}:</span>
                        </div>
                        <p className="text-text leading-relaxed [overflow-wrap:anywhere]">
                          {reviewerComment}
                        </p>
                      </div>
                    )}

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
                );
              })
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

      {/* Action Modals */}
      {source && safeRevision && isSubmitModalOpen && canSubmit && (
        <KnowledgeSubmitModal
          revision={safeRevision}
          isOpen={isSubmitModalOpen}
          onClose={() => closeModalFor(source.id, safeRevision.id)}
          onSuccess={handleActionSuccess}
          onReload={handleReload}
          mustVerifyReload={Boolean(indeterminateLocks[`${safeRevision.id}:submit`])}
          onIndeterminateError={() => {
            if (currentSourceIdRef.current === source.id) {
              setIndeterminateLocks((prev) => ({ ...prev, [`${safeRevision.id}:submit`]: true }));
            }
          }}
        />
      )}

      {source && safeRevision && isWithdrawModalOpen && canWithdraw && (
        <KnowledgeWithdrawModal
          revision={safeRevision}
          isOpen={isWithdrawModalOpen}
          onClose={() => closeModalFor(source.id, safeRevision.id)}
          onSuccess={handleActionSuccess}
          onReload={handleReload}
          mustVerifyReload={Boolean(indeterminateLocks[`${safeRevision.id}:withdraw`])}
          onIndeterminateError={() => {
            if (currentSourceIdRef.current === source.id) {
              setIndeterminateLocks((prev) => ({ ...prev, [`${safeRevision.id}:withdraw`]: true }));
            }
          }}
        />
      )}

      {source && safeRevision && isNewRevisionModalOpen && canCreateNextRevision && (
        <KnowledgeNewRevisionModal
          source={source}
          baseRevision={safeRevision}
          isOpen={isNewRevisionModalOpen}
          onClose={() => closeModalFor(source.id, safeRevision.id)}
          onSuccess={handleActionSuccess}
          onReload={handleReload}
          mustVerifyReload={Boolean(indeterminateLocks[`${safeRevision.id}:newRev`])}
          onIndeterminateError={() => {
            if (currentSourceIdRef.current === source.id) {
              setIndeterminateLocks((prev) => ({ ...prev, [`${safeRevision.id}:newRev`]: true }));
            }
          }}
        />
      )}
    </div>
  );
}
