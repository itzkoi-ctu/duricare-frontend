import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import { useKnowledgeSourceDetail } from '../hooks/useKnowledgeSourceDetail';
import { useKnowledgeHistory } from '../hooks/useKnowledgeHistory';
import KnowledgeStatusBadge from '../components/knowledge/KnowledgeStatusBadge';
import DecisionOutcomeBadge from '../components/knowledge/DecisionOutcomeBadge';
import KnowledgeHistoryTable from '../components/knowledge/KnowledgeHistoryTable';
import KnowledgeSubmitModal from '../components/knowledge/KnowledgeSubmitModal';
import KnowledgeWithdrawModal from '../components/knowledge/KnowledgeWithdrawModal';
import KnowledgeNewRevisionModal from '../components/knowledge/KnowledgeNewRevisionModal';
import RevisionProvenanceModal from '../components/knowledge/import/RevisionProvenanceModal';
import PublicationHeadCard from '../components/knowledge/publication/PublicationHeadCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { SOURCE_TYPE_CONFIG, TOPIC_CONFIG, GROWTH_STAGE_CONFIG } from '../utils/governanceStatus';
import { evaluateDraftEditEligibility, evaluateAuthorActionEligibility } from '../utils/governanceAuth';
import type { RevisionResponse, DecisionDetail, RevisionStatus } from '../types/governance';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

const STITCH_STATUS_STYLES: Record<
  RevisionStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  IN_REVIEW: {
    label: 'Đang thẩm định',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  CHANGES_REQUESTED: {
    label: 'Yêu cầu sửa đổi',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-500',
  },
  SUBMITTED: {
    label: 'Đã gửi',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    dotClass: 'bg-sky-500',
  },
  WITHDRAWN: {
    label: 'Đã rút',
    badgeClass: 'bg-zinc-50 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    dotClass: 'bg-zinc-500',
  },
  REJECTED: {
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};

export default function KnowledgeSourceDetailPage() {
  useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useExpertProfile();

  const [activeTab, setActiveTab] = useState<'chunks' | 'history'>('chunks');
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState(false);
  const [isRevisionDropdownOpen, setIsRevisionDropdownOpen] = useState(false);
  const [expandedChunkIndices, setExpandedChunkIndices] = useState<Record<number, boolean>>({ 0: true });
  const [isDecisionCardOpen, setIsDecisionCardOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

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
    setIsRevisionDropdownOpen(false);
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
    if (updatedRev.sourceId !== currentSourceIdRef.current) {
      return;
    }
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
    if (currentSourceIdRef.current !== targetSourceId) {
      return res;
    }
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

  const toggleChunk = (idx: number) => {
    setExpandedChunkIndices(prev => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const expandAllChunks = () => {
    const all: Record<number, boolean> = {};
    chunks.forEach((_, i) => {
      all[i] = true;
    });
    setExpandedChunkIndices(all);
  };

  const collapseAllChunks = () => {
    setExpandedChunkIndices({});
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
  const statusConfig = STITCH_STATUS_STYLES[status] || STITCH_STATUS_STYLES.DRAFT;

  return (
    <div className="space-y-5">
      {/* 1. Top Bar & Page Header */}
      <div className="space-y-2.5">
        {/* Back Link */}
        <Link
          to="/knowledge/sources"
          className="inline-flex items-center gap-1.5 text-secondary hover:text-primary text-xs md:text-sm font-semibold transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            arrow_back
          </span>
          <span>{t('Quay lại danh sách nguồn')}</span>
        </Link>

        {/* Title & Actions Row */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-text [overflow-wrap:anywhere] tracking-tight">
              {meta?.title || latestRev?.title || t('Chi tiết nguồn tri thức')}
            </h1>

            {/* Meta, Revision & Status Badges Row */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
              {/* Revision Selector Pill & Dropdown */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsRevisionDropdownOpen(prev => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface border border-border rounded-lg text-xs font-medium text-text hover:bg-surface-hover transition-colors cursor-pointer shadow-2xs"
                  title={t('Chọn phiên bản')}
                  aria-haspopup="true"
                  aria-expanded={isRevisionDropdownOpen}
                >
                  <span>
                    {safeRevision
                      ? t('Bản {0}', [safeRevision.revisionNumber]) + (isLatestRevision ? ` · ${t('Mới nhất')}` : '')
                      : t('Chưa có bản sửa đổi')}
                  </span>
                  {revisionsList.length > 1 && (
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray">
                      expand_more
                    </span>
                  )}
                </button>

                {/* Dropdown Menu when multiple revisions exist */}
                {isRevisionDropdownOpen && revisionsList.length > 1 && (
                  <div
                    className="absolute left-0 mt-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg z-50 space-y-1"
                    role="menu"
                  >
                    {revisionsList.map((r) => {
                      const isSelected = revision?.id === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          data-testid={`revision-tab-${r.revisionNumber}`}
                          onClick={() => {
                            selectRevision(r.id);
                            setIsRevisionDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-navy text-surface dark:text-bg'
                              : 'text-text hover:bg-surface-hover'
                          }`}
                        >
                          <span>{t('Bản {0}', [r.revisionNumber])}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSelected
                                ? 'bg-white/20 text-surface'
                                : 'bg-surface-hover text-gray'
                            }`}
                          >
                            {t(STITCH_STATUS_STYLES[r.status]?.label || r.status)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Review Status Badge */}
              <span
                data-testid={`status-badge-${status}`}
                className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-lg text-xs font-semibold leading-none border shrink-0 ${statusConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
                <span className="leading-none">{t(statusConfig.label)}</span>
              </span>

              {/* Assessed / Proposed Tier Badge */}
              {decision?.assessedTier ? (
                <span
                  data-testid="header-assessed-tier-badge"
                  className="inline-flex items-center gap-1 px-2.5 h-6 rounded-lg text-xs font-semibold leading-none bg-blue-50 text-primary border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shrink-0"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined badge-icon text-primary dark:text-blue-300 shrink-0"
                  >
                    verified
                  </span>
                  <span className="leading-none">{t('Tầng {0} đã xác nhận', [decision.assessedTier])}</span>
                </span>
              ) : meta?.proposedTier ? (
                <span
                  data-testid="header-proposed-tier-badge"
                  className="inline-flex items-center gap-1 px-2.5 h-6 rounded-lg text-xs font-semibold leading-none bg-surface border border-border text-gray shrink-0"
                >
                  <span className="leading-none">{t('Tầng {0} đề xuất', [meta.proposedTier])}</span>
                </span>
              ) : null}

              {/* Separator dot */}
              <span className="text-gray text-xs hidden sm:inline">•</span>

              {/* Owner & Meta */}
              <span className="text-gray text-xs">
                {t('Người tạo')}: <strong className="font-medium text-text">{source.ownerDisplayName}</strong>
                {authorEligibility.isVerifiedOwner && (
                  <span className="ml-1 text-teal font-semibold">({t('Bạn')})</span>
                )}
                {' · '}
                {t('Cập nhật')}:{' '}
                <span className="font-medium text-text">{formatDate(safeRevision?.createdAt || source.createdAt)}</span>
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap self-start">
            <button
              type="button"
              onClick={() => { reload().catch(() => {}); }}
              title={t('Tải lại dữ liệu')}
              className="p-2 rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-surface-hover transition-colors cursor-pointer shadow-2xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                refresh
              </span>
            </button>

            {/* Provenance Action (Desktop header per approved desktop screen; mobile uses action card row) */}
            {safeRevision && (
              <button
                type="button"
                data-testid="view-provenance-button"
                onClick={() => setIsProvenanceModalOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                title={t('Xem nguồn gốc tài liệu và dòng dõi dữ liệu')}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">
                  account_tree
                </span>
                <span>{t('Nguồn gốc')}</span>
              </button>
            )}

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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer transition-opacity"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-coral/10 border border-coral/30 text-coral hover:bg-coral/20 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  archive
                </span>
                <span>{t('Rút hồ sơ')}</span>
              </button>
            )}

            {/* Terminal actions (e.g. Create Subsequent Revision) are now integrated into the Right Rail Action Card per approved Stitch designs */}
          </div>
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

      {/* Revisions Switcher Tabs (when multiple revisions exist) */}
      {revisionsList.length > 1 && (
        <div
          data-testid="revisions-switcher-bar"
          className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/70"
        >
          <span className="text-xs font-semibold text-gray shrink-0">{t('Phiên bản')}:</span>
          {revisionsList.map((r) => {
            const isSelected = revision?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                data-testid={`revision-tab-${r.revisionNumber}`}
                onClick={() => selectRevision(r.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-navy text-surface dark:text-bg shadow-xs'
                    : 'bg-surface border border-border text-gray hover:text-text hover:bg-surface-hover'
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
          className="p-3.5 md:p-4 rounded-xl border border-amber/30 bg-amber/10 text-amber space-y-1 shadow-xs"
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
          className="p-3.5 md:p-4 rounded-xl border border-blue/30 bg-blue/10 text-blue space-y-1 shadow-xs"
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
          className="bg-surface border border-border rounded-lg p-3 px-4 flex items-center justify-between text-xs shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[18px]">
              verified
            </span>
            <span className="text-text font-medium">
              {t('Thẩm định đã hoàn tất')}
            </span>
          </div>
          <span className="text-[11px] text-gray hidden sm:inline">
            {t('Hồ sơ nguồn đã được phê duyệt thẩm định chuyên môn đạt tiêu chuẩn.')}
          </span>
        </div>
      )}

      {status === 'CHANGES_REQUESTED' && (
        <div
          data-testid="changes-requested-notice-banner"
          className="p-3.5 md:p-4 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-1 shadow-xs"
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
          className="p-3.5 md:p-4 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-1 shadow-xs"
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
          className="p-3.5 md:p-4 rounded-xl border border-border bg-bg text-gray space-y-1 shadow-xs"
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

      {/* 2. Main Two-Column Layout (Desktop: 8 cols main, 4 cols rail; Mobile: single column with Right Rail first) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RIGHT RAIL COLUMN (On mobile: order-1 so publication & review actions appear right after header; on desktop: lg:order-2 lg:col-span-4) */}
        <div className="order-1 lg:order-2 lg:col-span-4 space-y-4 w-full">
          {/* Card 1: RAG Publication Head Card for ADMIN (includes Create Revision below Publish on desktop & mobile) */}
          {user?.role === 'ADMIN' && (
            <PublicationHeadCard
              source={source}
              currentRevision={safeRevision}
              isAdmin={true}
              onPublicationChanged={() => {
                reload().catch(() => {});
              }}
              canCreateNextRevision={canCreateNextRevision}
              onCreateNextRevision={
                canCreateNextRevision && safeRevision
                  ? () =>
                      setActiveModal({
                        type: 'newRevision',
                        sourceId: source.id,
                        revisionId: safeRevision.id,
                      })
                  : undefined
              }
              onViewProvenance={
                safeRevision ? () => setIsProvenanceModalOpen(true) : undefined
              }
            />
          )}

          {/* Non-ADMIN document author actions (e.g. verified EXPERT owner creating subsequent revision, and mobile provenance access) */}
          {user?.role !== 'ADMIN' && safeRevision && (
            <div
              className={`p-4 md:p-5 rounded-xl border border-border bg-surface shadow-xs space-y-3 ${
                !canCreateNextRevision ? 'md:hidden' : ''
              }`}
              data-testid="expert-document-actions-card"
            >
              <div className="flex items-center gap-2 border-b border-border pb-2.5">
                <span aria-hidden="true" className="material-symbols-outlined text-primary text-lg">
                  description
                </span>
                <h3 className="font-semibold text-xs text-text">{t('Thao tác tài liệu')}</h3>
              </div>
              <div className="space-y-2">
                {canCreateNextRevision && (
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
                    className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-secondary text-secondary hover:bg-surface-hover text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      add_circle
                    </span>
                    <span>{t('Tạo phiên bản mới')}</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="mobile-view-provenance-button"
                  onClick={() => setIsProvenanceModalOpen(true)}
                  className="md:hidden w-full h-11 min-h-[44px] px-4 rounded-xl border border-border text-text hover:bg-surface-hover text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">
                    account_tree
                  </span>
                  <span>{t('Nguồn gốc')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Reviewer Decision Details Card (if decision exists) */}
          {decision && (
            <details
              data-testid="decision-detail-card"
              className="group bg-surface border border-border rounded-xl shadow-xs overflow-hidden"
              open={isDecisionCardOpen}
              onToggle={(e) => setIsDecisionCardOpen(e.currentTarget.open)}
            >
              <summary
                data-testid="decision-detail-summary"
                className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2.5 p-3.5 px-4 cursor-pointer select-none hover:bg-surface-hover transition-colors lg:cursor-default list-none"
              >
                <div className="flex items-center gap-2 shrink-0" data-testid="decision-card-title">
                  <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                    verified
                  </span>
                  <h3 className="text-sm font-semibold text-text whitespace-nowrap">
                    {t('Kết quả thẩm định')}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-nowrap" data-testid="decision-card-badges">
                  <DecisionOutcomeBadge
                    outcome={decision.outcome}
                    shape="rounded"
                    size="sm"
                    showIcon={false}
                  />
                  {decision.assessedTier && (
                    <span
                      data-testid="card-assessed-tier-badge"
                      className="inline-flex items-center px-2.5 h-6 rounded-lg text-xs font-semibold leading-none bg-blue-50 text-primary border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shrink-0"
                    >
                      <span className="leading-none">{t('Tầng {0}', [decision.assessedTier])}</span>
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[20px] text-gray group-open:rotate-180 transition-transform duration-200 lg:hidden ml-0.5"
                  >
                    expand_more
                  </span>
                </div>
              </summary>

              <div className="p-4 md:p-5 pt-2 border-t border-border space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray">{t('Thời gian thẩm định:')}</span>
                  <span className="font-medium text-text font-mono">{formatDate(decision.decidedAt)}</span>
                </div>

                {decision.reviewerUserId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray">{t('Thẩm định viên:')}</span>
                    <span className="font-medium text-text font-mono">ID: {decision.reviewerUserId}</span>
                  </div>
                )}

                <div className="pt-1">
                  <span className="text-gray block mb-1 font-semibold">{t('Đánh giá tổng quát:')}</span>
                  <div className="p-2.5 rounded-lg bg-bg border border-border/80 text-text leading-relaxed [overflow-wrap:anywhere]">
                    “{decision.reason}”
                  </div>
                </div>

                {decision.tierRationale && (
                  <div className="pt-1">
                    <span className="text-gray block mb-1 font-semibold">{t('Căn cứ xếp tầng tri thức:')}</span>
                    <div className="p-2.5 rounded-lg bg-bg border border-border/80 text-text [overflow-wrap:anywhere]">
                      {decision.tierRationale}
                    </div>
                  </div>
                )}

                {/* Collapsible Evaluation Criteria Checklist */}
                <details className="group/crit border border-border/80 rounded-lg p-3 bg-surface-hover/30 text-xs">
                  <summary className="flex items-center justify-between cursor-pointer font-semibold text-text select-none">
                    <span>{t('Tiêu chí đánh giá')}</span>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[18px] group-open/crit:rotate-180 transition-transform duration-200"
                    >
                      expand_more
                    </span>
                  </summary>

                  <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray">{t('Đối chiếu tài liệu nguồn:')}</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          decision.checkedSource ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray/50'
                        }`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          {decision.checkedSource ? 'check_circle' : 'cancel'}
                        </span>
                        <span>{decision.checkedSource ? t('Đạt chuẩn') : t('Chưa đạt')}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray">{t('Trung thực trích đoạn:')}</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          decision.checkedFaithfulness ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray/50'
                        }`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          {decision.checkedFaithfulness ? 'check_circle' : 'cancel'}
                        </span>
                        <span>{decision.checkedFaithfulness ? t('Đạt chuẩn') : t('Chưa đạt')}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray">{t('Phạm vi áp dụng:')}</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          decision.checkedApplicability ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray/50'
                        }`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          {decision.checkedApplicability ? 'check_circle' : 'cancel'}
                        </span>
                        <span>{decision.checkedApplicability ? t('Đã xác thực') : t('Chưa đạt')}</span>
                      </span>
                    </div>
                  </div>
                </details>
              </div>
            </details>
          )}
        </div>

        {/* LEFT MAIN COLUMN (On mobile: order-2; on desktop: lg:order-1 lg:col-span-8) */}
        <div className="order-2 lg:order-1 lg:col-span-8 space-y-4 w-full">
          {/* Tab Navigation */}
          <div className="border-b border-border flex gap-6 px-1">
            <button
              type="button"
              data-testid="tab-chunks"
              onClick={() => setActiveTab('chunks')}
              className={`pb-2.5 text-xs md:text-sm font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'chunks'
                  ? 'text-primary border-primary'
                  : 'text-gray border-transparent hover:text-text'
              }`}
            >
              <span>{t('Nội dung')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-primary text-xs font-bold">
                {chunks.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="tab-history"
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 text-xs md:text-sm font-medium border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'history'
                  ? 'text-primary border-primary font-semibold'
                  : 'text-gray border-transparent hover:text-text'
              }`}
            >
              <span>{t('Lịch sử')}</span>
              {historyData && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-gray text-xs font-bold">
                  {historyData.totalElements}
                </span>
              )}
            </button>
          </div>

          {/* CHUNKS TAB CONTENT */}
          {activeTab === 'chunks' && (
            <div className="space-y-4">
              {/* Compact Collapsible "Thông tin tài liệu" card */}
              <details data-testid="document-metadata-card" className="group bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
                <summary className="flex items-center justify-between p-3.5 px-4 cursor-pointer select-none hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[20px]">
                      description
                    </span>
                    <span className="text-sm text-text font-semibold shrink-0">
                      {t('Thông tin tài liệu')}
                    </span>
                    {(meta?.authors || meta?.evidenceReference) && (
                      <span className="text-gray text-xs truncate hidden sm:inline">
                        — {meta?.authors || meta?.evidenceReference}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray uppercase tracking-wider hidden sm:inline">
                      {t('Thuộc tính')}
                    </span>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[20px] text-gray group-open:rotate-180 transition-transform duration-200"
                    >
                      expand_more
                    </span>
                  </div>
                </summary>

                <div className="px-5 pb-5 pt-2 border-t border-border">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs pt-2">
                    <div>
                      <dt className="text-gray mb-0.5">{t('Tác giả')}</dt>
                      <dd className="text-text font-medium [overflow-wrap:anywhere]">{meta?.authors || t('Chưa cập nhật')}</dd>
                    </div>
                    <div>
                      <dt className="text-gray mb-0.5">{t('Nhà xuất bản')}</dt>
                      <dd className="text-text font-medium [overflow-wrap:anywhere]">{meta?.publisher || t('Chưa cập nhật')}</dd>
                    </div>
                    <div>
                      <dt className="text-gray mb-0.5">{t('Loại tài liệu')}</dt>
                      <dd className="text-text font-medium">
                        {meta ? t(SOURCE_TYPE_CONFIG[meta.sourceType]) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray mb-0.5">{t('Năm phát hành')}</dt>
                      <dd className="text-text font-medium">{meta?.year || t('Chưa cập nhật')}</dd>
                    </div>
                    <div>
                      <dt className="text-gray mb-0.5">{t('Phiên bản ấn phẩm')}</dt>
                      <dd className="text-text font-medium">{meta?.edition || t('Chưa cập nhật')}</dd>
                    </div>
                    <div>
                      <dt className="text-gray mb-0.5">{t('Tham chiếu vị trí')}</dt>
                      <dd className="text-text font-medium [overflow-wrap:anywhere]">{meta?.evidenceReference || '—'}</dd>
                    </div>
                    {meta?.proposedTier && (
                      <div className="sm:col-span-2">
                        <dt className="text-gray mb-0.5">{t('Tầng tri thức đề xuất')}</dt>
                        <dd className="text-text flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-primary">{t('Tầng {0}', [meta.proposedTier])}</span>
                          {meta.proposedTierRationale && (
                            <span className="text-gray text-xs">({meta.proposedTierRationale})</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {meta?.provenanceNotes && (
                      <div className="sm:col-span-2">
                        <dt className="text-gray mb-0.5">{t('Ghi chú xuất xứ')}</dt>
                        <dd className="text-text leading-relaxed [overflow-wrap:anywhere]">{meta.provenanceNotes}</dd>
                      </div>
                    )}
                    {meta?.sourceUrl ? (
                      <div className="sm:col-span-2">
                        <dt className="text-gray mb-0.5">{t('Đường dẫn nguồn')}</dt>
                        <dd className="text-secondary truncate">
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
                    ) : (
                      <div>
                        <dt className="text-gray mb-0.5">{t('Đường dẫn nguồn')}</dt>
                        <dd className="text-gray italic">{t('Chưa có liên kết ngoài')}</dd>
                      </div>
                    )}

                    {/* Technical details disclosure */}
                    <div className="sm:col-span-2 border-t border-border pt-2 mt-1">
                      <details className="text-[11px] text-gray">
                        <summary className="cursor-pointer hover:text-text flex items-center justify-between">
                          <span>{t('Chi tiết kỹ thuật (UUID)')}</span>
                          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                            expand_more
                          </span>
                        </summary>
                        <div className="pt-2 space-y-1 font-mono text-[10px] text-gray select-all">
                          <div>Source UUID: {source.id} (v{source.version})</div>
                          {safeRevision && (
                            <div>Revision UUID: {safeRevision.id} (Rev #{safeRevision.revisionNumber}, v{safeRevision.version})</div>
                          )}
                        </div>
                      </details>
                    </div>
                  </dl>
                </div>
              </details>

              {/* Chunks Action & Controls Bar */}
              {chunks.length > 0 && (
                <div className="flex items-center justify-between text-xs text-gray px-1">
                  <span>
                    {t('Hiển thị {0} đoạn trích kiến thức', [chunks.length])}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={expandAllChunks}
                      className="hover:text-text underline cursor-pointer"
                    >
                      {t('Mở tất cả')}
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={collapseAllChunks}
                      className="hover:text-text underline cursor-pointer"
                    >
                      {t('Thu gọn tất cả')}
                    </button>
                  </div>
                </div>
              )}

              {/* Chunks Section */}
              <div className="space-y-3">
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
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal text-surface dark:text-bg text-xs font-semibold shadow-xs"
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
                    const isExpanded = Boolean(expandedChunkIndices[idx]);

                    if (isExpanded) {
                      return (
                        <article
                          key={c.chunkId || `chunk-${idx}`}
                          data-testid={`chunk-article-${idx}`}
                          className="bg-surface border border-border rounded-xl p-4 md:p-5 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-navy text-surface dark:text-bg shrink-0">
                                  {t('Đoạn {0}', [c.position + 1])}
                                </span>
                                <h4 className="text-sm md:text-base font-semibold text-text [overflow-wrap:anywhere]">
                                  {c.title}
                                </h4>
                              </div>

                              {/* Badges / Metadata Line */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray pt-0.5">
                                <span>
                                  {t('Chủ đề')}: <strong className="text-text font-medium">{t(TOPIC_CONFIG[c.topic] || c.topic)}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  {t('Định vị')}: <strong className="text-text font-medium">{c.locator || '—'}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  {t('Giai đoạn')}:{' '}
                                  <strong className="text-text font-medium">
                                    {c.stage ? t(GROWTH_STAGE_CONFIG[c.stage] || c.stage) : t('Chưa xác định giai đoạn')}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleChunk(idx)}
                              aria-label={t('Thu gọn đoạn')}
                              className="text-gray hover:text-text p-1 cursor-pointer transition-colors shrink-0"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                                expand_less
                              </span>
                            </button>
                          </div>

                          {/* Body Text */}
                          {c.content && (
                            <div className="p-3.5 bg-bg/50 rounded-lg border border-border text-sm leading-[22px] text-text whitespace-pre-wrap [overflow-wrap:anywhere]">
                              {c.content}
                            </div>
                          )}

                          {/* Secondary Disclosure: Trích đoạn gốc và ghi chú */}
                          <details className="group border border-border/80 rounded-lg p-3 bg-surface-hover/30">
                            <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-secondary select-none">
                              <span className="flex items-center gap-1.5">
                                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                                  notes
                                </span>
                                <span>{t('Trích đoạn gốc và ghi chú')}</span>
                              </span>
                              <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform duration-200"
                              >
                                expand_more
                              </span>
                            </summary>

                            <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5 text-xs">
                              {c.originalExcerpt && (
                                <div>
                                  <span className="text-[11px] uppercase tracking-wide text-gray font-semibold block">
                                    {t('Trích đoạn gốc:')}
                                  </span>
                                  <p className="text-text italic mt-0.5 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                                    “{c.originalExcerpt}”
                                  </p>
                                </div>
                              )}

                              {c.applicabilityNotes && (
                                <div>
                                  <span className="text-[11px] uppercase tracking-wide text-gray font-semibold block">
                                    {t('Ghi chú áp dụng:')}
                                  </span>
                                  <p className="text-text mt-0.5 leading-relaxed [overflow-wrap:anywhere]">
                                    {c.applicabilityNotes}
                                  </p>
                                </div>
                              )}

                              {c.measurementNotes && (
                                <div>
                                  <span className="text-[11px] uppercase tracking-wide text-gray font-semibold block">
                                    {t('Ghi chú đo lường:')}
                                  </span>
                                  <p className="text-text mt-0.5 leading-relaxed [overflow-wrap:anywhere]">
                                    {c.measurementNotes}
                                  </p>
                                </div>
                              )}

                              {reviewerComment && (
                                <div
                                  data-testid={`chunk-comment-${c.chunkId}`}
                                  className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-0.5"
                                >
                                  <span className="text-[11px] font-bold flex items-center gap-1">
                                    <span aria-hidden="true" className="material-symbols-outlined text-sm">
                                      rate_review
                                    </span>
                                    <span>{t('Nhận xét của thẩm định viên:')}</span>
                                  </span>
                                  <p className="text-text text-xs leading-relaxed [overflow-wrap:anywhere]">
                                    {reviewerComment}
                                  </p>
                                </div>
                              )}
                            </div>
                          </details>
                        </article>
                      );
                    }

                    // Collapsed chunk item (44px touch affordance)
                    return (
                      <div
                        key={c.chunkId || `chunk-${idx}`}
                        data-testid={`chunk-collapsed-${idx}`}
                        onClick={() => toggleChunk(idx)}
                        className="h-11 px-3.5 flex items-center justify-between rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer shadow-xs select-none"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                            {t('Đoạn {0}', [c.position + 1])}
                          </span>
                          <h4 className="text-xs md:text-sm font-semibold text-text truncate">
                            {c.title}
                          </h4>
                          {c.locator && (
                            <span className="text-[11px] text-gray hidden sm:inline truncate">
                              · {c.locator}
                            </span>
                          )}
                        </div>
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray shrink-0">
                          expand_more
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB CONTENT */}
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

      {safeRevision && isProvenanceModalOpen && (
        <RevisionProvenanceModal
          isOpen={isProvenanceModalOpen}
          onClose={() => setIsProvenanceModalOpen(false)}
          revisionId={safeRevision.id}
        />
      )}
    </div>
  );
}
