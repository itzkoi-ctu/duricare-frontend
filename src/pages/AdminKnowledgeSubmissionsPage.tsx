import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { listSubmissions, getRevision, parseGovernanceError } from '../api/governance';
import type { RevisionSummary, RevisionStatus, RevisionResponse, AssignmentSummary, AssignmentDetail } from '../types/governance';
import AdminAssignReviewerModal from '../components/knowledge/AdminAssignReviewerModal';
import AdminReassignReviewerModal from '../components/knowledge/AdminReassignReviewerModal';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import AdminPublicationsTab from '../components/knowledge/publication/AdminPublicationsTab';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
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

type TabFilter = 'ACTIONABLE' | 'SUBMITTED' | 'IN_REVIEW' | 'TERMINAL' | 'PUBLICATIONS';

const STATUS_CONFIG: Record<
  RevisionStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  SUBMITTED: {
    label: 'Chờ phân công',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  IN_REVIEW: {
    label: 'Đang thẩm định',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  CHANGES_REQUESTED: {
    label: 'Yêu cầu sửa đổi',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  REJECTED: {
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
  WITHDRAWN: {
    label: 'Đã rút',
    badgeClass: 'bg-zinc-50 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    dotClass: 'bg-zinc-500',
  },
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-500',
  },
};

export default function AdminKnowledgeSubmissionsPage() {
  useLanguage();

  const [activeTab, setActiveTab] = useState<TabFilter>('ACTIONABLE');
  const [terminalStatus, setTerminalStatus] = useState<RevisionStatus>('APPROVED');
  const [submissions, setSubmissions] = useState<RevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal target state
  const [assignTarget, setAssignTarget] = useState<RevisionSummary | null>(null);
  const assignTargetRef = useRef<RevisionSummary | null>(null);
  assignTargetRef.current = assignTarget;
  const assignSessionRef = useRef<number>(0);

  const [reassignTarget, setReassignTarget] = useState<{
    revision: RevisionSummary;
    assignment: AssignmentSummary;
  } | null>(null);
  const reassignTargetRef = useRef<{
    revision: RevisionSummary;
    assignment: AssignmentSummary;
  } | null>(null);
  reassignTargetRef.current = reassignTarget;
  const reassignSessionRef = useRef<number>(0);

  const [loadingTargetDetailRevId, setLoadingTargetDetailRevId] = useState<string | null>(null);
  const [indeterminateLocks, setIndeterminateLocks] = useState<Record<string, boolean>>({});

  const activeTabRef = useRef<TabFilter>(activeTab);
  activeTabRef.current = activeTab;

  const terminalStatusRef = useRef<RevisionStatus>(terminalStatus);
  terminalStatusRef.current = terminalStatus;

  const pageRef = useRef<number>(page);
  pageRef.current = page;

  const activeRequestRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);

    const targetTab = activeTabRef.current;
    if (targetTab === 'PUBLICATIONS') {
      setLoading(false);
      return;
    }
    const targetTerminalStatus = terminalStatusRef.current;
    const targetPage = pageRef.current;

    let statusParam: RevisionStatus | undefined;
    if (targetTab === 'SUBMITTED') {
      statusParam = 'SUBMITTED';
    } else if (targetTab === 'IN_REVIEW') {
      statusParam = 'IN_REVIEW';
    } else if (targetTab === 'TERMINAL') {
      statusParam = targetTerminalStatus;
    }

    try {
      const res = await listSubmissions(targetPage, 15, statusParam, controller.signal);
      if (
        !controller.signal.aborted &&
        activeTabRef.current === targetTab &&
        terminalStatusRef.current === targetTerminalStatus &&
        pageRef.current === targetPage
      ) {
        setSubmissions(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
        setLoading(false);
      }
    } catch (err) {
      if (!controller.signal.aborted && activeTabRef.current === targetTab) {
        const parsed = parseGovernanceError(err, t('Không thể tải hàng đợi thẩm định.'));
        setError(parsed.message);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, [activeTab, page, terminalStatus, loadData]);

  const handleTabChange = (tab: TabFilter) => {
    assignSessionRef.current += 1;
    reassignSessionRef.current += 1;
    setActiveTab(tab);
    setPage(0);
    setAssignTarget(null);
    setReassignTarget(null);
    setLoadingTargetDetailRevId(null);
  };

  const handleOpenAssign = (rev: RevisionSummary) => {
    assignSessionRef.current += 1;
    setAssignTarget(rev);
  };

  const handleCloseAssign = () => {
    assignSessionRef.current += 1;
    setAssignTarget(null);
  };

  const handleOpenReassign = async (rev: RevisionSummary) => {
    reassignSessionRef.current += 1;
    const session = reassignSessionRef.current;
    setLoadingTargetDetailRevId(rev.id);
    try {
      const detail: RevisionResponse = await getRevision(rev.id);
      if (reassignSessionRef.current !== session) {
        return;
      }
      if (detail.activeAssignment) {
        setReassignTarget({
          revision: rev,
          assignment: detail.activeAssignment,
        });
      } else {
        // Fallback to assign if no active assignment found
        assignSessionRef.current += 1;
        setAssignTarget(rev);
      }
    } catch (err) {
      if (reassignSessionRef.current !== session) return;
      const parsed = parseGovernanceError(err, t('Không thể tải chi tiết phân công.'));
      setError(parsed.message);
    } finally {
      setLoadingTargetDetailRevId(prev => (prev === rev.id ? null : prev));
    }
  };

  const handleCloseReassign = () => {
    reassignSessionRef.current += 1;
    setReassignTarget(null);
    setLoadingTargetDetailRevId(null);
  };

  const handleAssignSuccess = (_assignment: AssignmentDetail) => {
    if (assignTarget) {
      setIndeterminateLocks(prev => {
        const next = { ...prev };
        delete next[`assign-${assignTarget.id}`];
        return next;
      });
    }
    if (reassignTarget) {
      setIndeterminateLocks(prev => {
        const next = { ...prev };
        delete next[`reassign-${reassignTarget.revision.id}`];
        return next;
      });
    }
    assignSessionRef.current += 1;
    reassignSessionRef.current += 1;
    setAssignTarget(null);
    setReassignTarget(null);
    setLoadingTargetDetailRevId(null);
    loadData();
  };

  const handleReloadAssignTarget = async () => {
    if (!assignTarget) return null;
    const session = assignSessionRef.current;
    const targetRevId = assignTarget.id;
    try {
      const freshDetail: RevisionResponse = await getRevision(targetRevId);
      if (assignSessionRef.current !== session || assignTargetRef.current?.id !== targetRevId) {
        return { stale: true };
      }

      if (freshDetail.activeAssignment || freshDetail.status !== 'SUBMITTED') {
        assignSessionRef.current += 1;
        setAssignTarget(null);
        setIndeterminateLocks(prev => {
          const next = { ...prev };
          delete next[`assign-${freshDetail.id}`];
          return next;
        });
        loadData();
        return { committed: true };
      }

      const freshSummary: RevisionSummary = {
        id: freshDetail.id,
        sourceId: freshDetail.sourceId,
        revisionNumber: freshDetail.revisionNumber,
        version: freshDetail.version,
        status: freshDetail.status,
        title: freshDetail.title,
        submittedAt: freshDetail.submittedAt,
        updatedAt: freshDetail.updatedAt,
      };

      setAssignTarget(freshSummary);
      setIndeterminateLocks(prev => {
        const next = { ...prev };
        delete next[`assign-${targetRevId}`];
        return next;
      });
      return freshSummary;
    } catch (err) {
      if (assignSessionRef.current !== session || assignTargetRef.current?.id !== targetRevId) {
        return { stale: true };
      }
      loadData();
      throw err;
    }
  };

  const handleReloadReassignTarget = async () => {
    if (!reassignTarget) return null;
    const session = reassignSessionRef.current;
    const targetRevId = reassignTarget.revision.id;
    const targetAssignmentId = reassignTarget.assignment.id;
    try {
      const freshDetail: RevisionResponse = await getRevision(targetRevId);
      if (
        reassignSessionRef.current !== session ||
        reassignTargetRef.current?.revision.id !== targetRevId ||
        reassignTargetRef.current?.assignment.id !== targetAssignmentId
      ) {
        return { stale: true };
      }

      if (
        !freshDetail.activeAssignment ||
        freshDetail.status !== 'IN_REVIEW' ||
        freshDetail.activeAssignment.id !== targetAssignmentId
      ) {
        reassignSessionRef.current += 1;
        setReassignTarget(null);
        setIndeterminateLocks(prev => {
          const next = { ...prev };
          delete next[`reassign-${freshDetail.id}`];
          return next;
        });
        loadData();
        return { committed: true };
      }

      const freshSummary: RevisionSummary = {
        id: freshDetail.id,
        sourceId: freshDetail.sourceId,
        revisionNumber: freshDetail.revisionNumber,
        version: freshDetail.version,
        status: freshDetail.status,
        title: freshDetail.title,
        submittedAt: freshDetail.submittedAt,
        updatedAt: freshDetail.updatedAt,
      };

      setReassignTarget({
        revision: freshSummary,
        assignment: freshDetail.activeAssignment,
      });
      setIndeterminateLocks(prev => {
        const next = { ...prev };
        delete next[`reassign-${targetRevId}`];
        return next;
      });
      return freshSummary;
    } catch (err) {
      if (
        reassignSessionRef.current !== session ||
        reassignTargetRef.current?.revision.id !== targetRevId ||
        reassignTargetRef.current?.assignment.id !== targetAssignmentId
      ) {
        return { stale: true };
      }
      loadData();
      throw err;
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* 1. Page Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
            {t('Điều phối thẩm định')}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {t('Theo dõi hồ sơ và phân công chuyên gia')}
          </p>
        </div>

        <button
          type="button"
          data-testid="refresh-submissions-button"
          onClick={loadData}
          disabled={loading}
          className="h-11 min-h-[44px] rounded-lg border border-border bg-surface hover:bg-surface-hover px-3 sm:px-4 flex items-center justify-center gap-2 text-text font-medium text-xs sm:text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-40 shrink-0"
          title={t('Tải lại danh sách')}
        >
          <span className={`material-symbols-outlined text-[18px] text-text-muted ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>{t('Làm mới')}</span>
        </button>
      </div>

      {/* 2. Navigation Tabs (5 Tabs cuộn ngang trên mobile) */}
      <div className="border-b border-border bg-surface rounded-t-xl px-2 sm:px-3">
        <nav
          aria-label={t('Bộ lọc trạng thái')}
          className="flex items-center gap-2 sm:gap-3 -mb-px overflow-x-auto no-scrollbar whitespace-nowrap"
        >
          <button
            type="button"
            data-testid="tab-actionable"
            onClick={() => handleTabChange('ACTIONABLE')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'ACTIONABLE'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{t('Cần xử lý')}</span>
          </button>

          <button
            type="button"
            data-testid="tab-submitted"
            onClick={() => handleTabChange('SUBMITTED')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'SUBMITTED'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{t('Chờ phân công')}</span>
          </button>

          <button
            type="button"
            data-testid="tab-in-review"
            onClick={() => handleTabChange('IN_REVIEW')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'IN_REVIEW'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{t('Đang thẩm định')}</span>
          </button>

          <button
            type="button"
            data-testid="tab-terminal"
            onClick={() => handleTabChange('TERMINAL')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'TERMINAL'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{t('Đã có kết quả')}</span>
          </button>

          <button
            type="button"
            data-testid="tab-publications"
            onClick={() => handleTabChange('PUBLICATIONS')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'PUBLICATIONS'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{t('Xuất bản RAG')}</span>
          </button>
        </nav>
      </div>

      {/* Sub-status filter for Terminal Tab */}
      {activeTab === 'TERMINAL' && (
        <div className="flex items-center gap-2 pt-1 flex-wrap" data-testid="terminal-status-filter-group">
          <span className="text-xs text-text-muted font-medium">{t('Lọc kết quả')}:</span>
          {(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'WITHDRAWN'] as const).map(st => (
            <button
              key={st}
              type="button"
              data-testid={`terminal-filter-${st}`}
              onClick={() => {
                setTerminalStatus(st);
                setPage(0);
              }}
              className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                terminalStatus === st
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-xs'
                  : 'border-border bg-surface text-text-muted hover:text-text hover:bg-surface-hover'
              }`}
            >
              {st === 'APPROVED'
                ? t('Đã duyệt')
                : st === 'CHANGES_REQUESTED'
                ? t('Yêu cầu sửa')
                : st === 'REJECTED'
                ? t('Từ chối')
                : t('Đã rút')}
            </button>
          ))}
        </div>
      )}

      {/* 3. Queue Summary Counter & Top Pagination */}
      {activeTab !== 'PUBLICATIONS' && !loading && !error && submissions.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-0.5">
          <span className="text-xs text-text-muted font-medium">
            {totalElements} {t('hồ sơ trong bộ lọc hiện tại')}
          </span>

          {totalPages > 1 && (
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-xs text-text-muted">
                {t('Trang {0} / {1} · 15 hồ sơ / trang', [page + 1, totalPages])}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(p => p - 1)}
                  className="w-10 h-10 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                  title={t('Trang trước')}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    chevron_left
                  </span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="w-10 h-10 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                  title={t('Trang sau')}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Main Content Area */}
      {activeTab === 'PUBLICATIONS' ? (
        <AdminPublicationsTab />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : submissions.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-border bg-surface p-6 shadow-xs space-y-2">
          <span aria-hidden="true" className="material-symbols-outlined text-text-muted text-4xl">
            assignment_turned_in
          </span>
          <h2 className="text-base font-bold text-text">{t('Hàng đợi trống')}</h2>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {activeTab === 'SUBMITTED'
              ? t('Hiện không có hồ sơ nào đang chờ phân công thẩm định.')
              : activeTab === 'IN_REVIEW'
              ? t('Hiện không có hồ sơ nào đang trong tiến trình thẩm định.')
              : t('Không có hồ sơ nào trong mục này.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 4.1 DESKTOP TABLE (>= lg) */}
          <div className="hidden lg:block bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <table className="w-full border-collapse text-left" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-surface-hover/80 border-b border-border">
                  <th scope="col" className="py-3.5 px-6 text-xs uppercase tracking-wider text-text-muted font-semibold w-[43%]">
                    {t('Hồ sơ')}
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-xs uppercase tracking-wider text-text-muted font-semibold w-[10%]">
                    {t('Phiên bản')}
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-xs uppercase tracking-wider text-text-muted font-semibold w-[17%]">
                    {t('Trạng thái')}
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-xs uppercase tracking-wider text-text-muted font-semibold w-[15%]">
                    {t('Ngày gửi')}
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-xs uppercase tracking-wider text-text-muted font-semibold w-[15%] text-right">
                    {t('Thao tác')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map(item => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr
                      key={item.id}
                      data-testid={`submission-row-${item.id}`}
                      className="hover:bg-surface-hover/50 transition-colors"
                    >
                      {/* Cột 1: Hồ sơ (Tiêu đề + Chi tiết kỹ thuật) */}
                      <td className="py-4 px-6 align-top">
                        <Link
                          to={`/knowledge/sources/${item.sourceId}`}
                          className="text-sm font-semibold text-text hover:text-brand-primary leading-snug break-words block mb-1"
                        >
                          {item.title}
                        </Link>
                        <details className="group">
                          <summary className="text-[11px] text-text-muted hover:text-text cursor-pointer select-none inline-flex items-center gap-1">
                            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                              unfold_more
                            </span>
                            <span>{t('Chi tiết kỹ thuật')}</span>
                          </summary>
                          <div className="mt-1.5 p-2 bg-surface-hover rounded border border-border text-[11px] font-mono text-text-muted space-y-0.5 break-all">
                            <div>
                              {t('Mã nguồn')}: {item.sourceId}
                            </div>
                            <div>
                              {t('Bản ghi')}: {item.id} · {t('Phiên bản dữ liệu')}: {item.version}
                            </div>
                          </div>
                        </details>
                      </td>

                      {/* Cột 2: Phiên bản */}
                      <td className="py-4 px-6 align-top">
                        <span className="h-6 px-2 text-xs font-medium rounded-[6px] bg-surface-hover border border-border text-text inline-flex items-center whitespace-nowrap">
                          {t('Bản {0}', [item.revisionNumber])}
                        </span>
                      </td>

                      {/* Cột 3: Trạng thái */}
                      <td className="py-4 px-6 align-top">
                        <span
                          className={`h-6 rounded-[6px] text-xs font-medium px-2.5 inline-flex items-center gap-1.5 whitespace-nowrap ${statusCfg.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                          <span>{t(statusCfg.label)}</span>
                        </span>
                      </td>

                      {/* Cột 4: Ngày gửi */}
                      <td className="py-4 px-6 align-top">
                        <span className="text-xs text-text-muted tabular-nums">
                          {formatDate(item.submittedAt || item.updatedAt)}
                        </span>
                      </td>

                      {/* Cột 5: Thao tác */}
                      <td className="py-4 px-6 align-top text-right">
                        {item.status === 'SUBMITTED' ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              data-testid={`assign-button-${item.id}`}
                              onClick={() => handleOpenAssign(item)}
                              className="h-11 min-h-[44px] bg-[#1f5ca9] hover:bg-[#184988] text-white font-semibold text-xs rounded-lg px-4 inline-flex items-center justify-center transition-colors shadow-xs cursor-pointer whitespace-nowrap min-w-[112px]"
                            >
                              {t('Phân công')}
                            </button>
                            <Link
                              to={`/knowledge/sources/${item.sourceId}`}
                              className="text-xs text-secondary hover:underline pr-1"
                            >
                              {t('Chi tiết')}
                            </Link>
                          </div>
                        ) : item.status === 'IN_REVIEW' ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              data-testid={`reassign-button-${item.id}`}
                              disabled={loadingTargetDetailRevId === item.id}
                              onClick={() => handleOpenReassign(item)}
                              className="h-11 min-h-[44px] border border-[#1f5ca9] text-[#1f5ca9] hover:bg-surface-hover font-semibold text-xs rounded-lg px-4 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap min-w-[112px]"
                            >
                              {loadingTargetDetailRevId === item.id && (
                                <div className="w-3.5 h-3.5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                              )}
                              <span>{t('Đổi người')}</span>
                            </button>
                            <Link
                              to={`/knowledge/sources/${item.sourceId}`}
                              className="text-xs text-secondary hover:underline pr-1"
                            >
                              {t('Chi tiết')}
                            </Link>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <Link
                              to={`/knowledge/sources/${item.sourceId}`}
                              className="h-11 min-h-[44px] px-4 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-semibold text-xs inline-flex items-center justify-center transition-colors shadow-xs whitespace-nowrap min-w-[112px]"
                            >
                              {t('Xem chi tiết')}
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4.2 MOBILE STACKED CARDS (< lg) */}
          <div className="lg:hidden space-y-3">
            {submissions.map(item => {
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;
              return (
                <article
                  key={item.id}
                  data-testid={`submission-card-${item.id}`}
                  className="bg-surface border border-border rounded-xl p-4 shadow-xs space-y-2.5"
                >
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="h-6 px-2 text-xs font-medium rounded-[6px] bg-surface-hover border border-border text-text inline-flex items-center whitespace-nowrap">
                        {t('Bản {0}', [item.revisionNumber])}
                      </span>
                      <span
                        className={`h-6 rounded-[6px] text-xs font-medium px-2.5 inline-flex items-center gap-1.5 whitespace-nowrap ${statusCfg.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                        <span>{t(statusCfg.label)}</span>
                      </span>
                    </div>
                    <time className="text-[11px] text-text-muted tabular-nums shrink-0">
                      {formatDate(item.submittedAt || item.updatedAt)}
                    </time>
                  </div>

                  {/* Document Title */}
                  <h2 className="text-sm sm:text-[15px] font-semibold text-text leading-snug break-words">
                    <Link
                      to={`/knowledge/sources/${item.sourceId}`}
                      className="hover:text-brand-primary transition-colors"
                    >
                      {item.title}
                    </Link>
                  </h2>

                  {/* Technical Disclosure */}
                  <details className="group rounded-lg border border-border/60 bg-surface-hover/60 overflow-hidden text-xs">
                    <summary className="px-3 py-2 cursor-pointer text-text-muted hover:text-text flex items-center justify-between select-none">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                          code
                        </span>
                        <span>{t('Chi tiết kỹ thuật')}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-[16px] group-open:rotate-180 transition-transform"
                      >
                        expand_more
                      </span>
                    </summary>
                    <div className="px-3 pb-2 pt-1 border-t border-border/30 text-[11px] font-mono text-text-muted space-y-0.5 break-all">
                      <div>
                        {t('Bản ghi')}: {item.id}
                      </div>
                      <div>
                        {t('Mã nguồn')}: {item.sourceId} · {t('Phiên bản dữ liệu')}: {item.version}
                      </div>
                    </div>
                  </details>

                  {/* Card Action Cluster */}
                  <div className="pt-1 border-t border-border/40">
                    {item.status === 'SUBMITTED' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`assign-button-mobile-${item.id}`}
                          onClick={() => handleOpenAssign(item)}
                          className="flex-1 h-11 min-h-[44px] bg-[#1f5ca9] hover:bg-[#184988] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                            person_add
                          </span>
                          <span>{t('Phân công')}</span>
                        </button>
                        <Link
                          to={`/knowledge/sources/${item.sourceId}`}
                          className="h-11 min-h-[44px] px-4 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-semibold text-xs inline-flex items-center justify-center transition-colors"
                        >
                          {t('Chi tiết')}
                        </Link>
                      </div>
                    ) : item.status === 'IN_REVIEW' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`reassign-button-mobile-${item.id}`}
                          disabled={loadingTargetDetailRevId === item.id}
                          onClick={() => handleOpenReassign(item)}
                          className="flex-1 h-11 min-h-[44px] border border-[#1f5ca9] text-[#1f5ca9] hover:bg-surface-hover font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {loadingTargetDetailRevId === item.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                          ) : (
                            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                              published_with_changes
                            </span>
                          )}
                          <span>{t('Đổi người')}</span>
                        </button>
                        <Link
                          to={`/knowledge/sources/${item.sourceId}`}
                          className="h-11 min-h-[44px] px-4 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-semibold text-xs inline-flex items-center justify-center transition-colors"
                        >
                          {t('Chi tiết')}
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/knowledge/sources/${item.sourceId}`}
                        className="w-full h-11 min-h-[44px] rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-semibold text-xs inline-flex items-center justify-center transition-colors shadow-xs"
                      >
                        {t('Xem chi tiết')}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* 4.3 Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-text-muted pt-2">
              <span>
                {t('Tổng số')}: {totalElements} {t('hồ sơ')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(p => p - 1)}
                  className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                >
                  {t('Trước')}
                </button>
                <span className="font-medium text-text px-1">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                >
                  {t('Sau')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Modals */}
      {assignTarget && (
        <AdminAssignReviewerModal
          revision={assignTarget}
          isOpen={Boolean(assignTarget)}
          onClose={handleCloseAssign}
          onSuccess={handleAssignSuccess}
          onReload={handleReloadAssignTarget}
          mustVerifyReload={Boolean(indeterminateLocks[`assign-${assignTarget.id}`])}
          onIndeterminateError={() =>
            setIndeterminateLocks(prev => ({
              ...prev,
              [`assign-${assignTarget.id}`]: true,
            }))
          }
        />
      )}

      {reassignTarget && (
        <AdminReassignReviewerModal
          revision={reassignTarget.revision}
          activeAssignment={reassignTarget.assignment}
          isOpen={Boolean(reassignTarget)}
          onClose={handleCloseReassign}
          onSuccess={handleAssignSuccess}
          onReload={handleReloadReassignTarget}
          mustVerifyReload={Boolean(indeterminateLocks[`reassign-${reassignTarget.revision.id}`])}
          onIndeterminateError={() =>
            setIndeterminateLocks(prev => ({
              ...prev,
              [`reassign-${reassignTarget.revision.id}`]: true,
            }))
          }
        />
      )}
    </div>
  );
}
