import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { listSubmissions, getRevision, parseGovernanceError } from '../api/governance';
import type { RevisionSummary, RevisionStatus, RevisionResponse, AssignmentSummary, AssignmentDetail } from '../types/governance';
import KnowledgeStatusBadge from '../components/knowledge/KnowledgeStatusBadge';
import AdminAssignReviewerModal from '../components/knowledge/AdminAssignReviewerModal';
import AdminReassignReviewerModal from '../components/knowledge/AdminReassignReviewerModal';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

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

type TabFilter = 'ACTIONABLE' | 'SUBMITTED' | 'IN_REVIEW' | 'TERMINAL';

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
    // When targetTab === 'ACTIONABLE', statusParam remains undefined:
    // Backend reviews.submissions returns findByStatusIn([SUBMITTED, IN_REVIEW]) preserving pagination!

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
      // Guard against stale response if session changed or target changed
      if (assignSessionRef.current !== session || assignTargetRef.current?.id !== targetRevId) {
        return { stale: true };
      }

      if (freshDetail.activeAssignment || freshDetail.status !== 'SUBMITTED') {
        // The assignment was committed or revision state transitioned on the server
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
        title: freshDetail.metadata?.title || assignTarget.title,
        submittedAt: freshDetail.submittedAt,
        updatedAt: freshDetail.updatedAt,
      };
      setAssignTarget(freshSummary);
      setIndeterminateLocks(prev => ({ ...prev, [`assign-${freshDetail.id}`]: false }));
      loadData();
      return freshSummary;
    } catch (err) {
      // If stale, do NOT propagate error or corrupt current modal/target
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
        title: freshDetail.metadata?.title || reassignTarget.revision.title,
        submittedAt: freshDetail.submittedAt,
        updatedAt: freshDetail.updatedAt,
      };
      setReassignTarget({
        revision: freshSummary,
        assignment: freshDetail.activeAssignment,
      });
      setIndeterminateLocks(prev => ({ ...prev, [`reassign-${freshDetail.id}`]: false }));
      loadData();
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-navy dark:text-blue mb-1">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              rule
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-text">
              {t('Hàng đợi điều phối thẩm định')}
            </h1>
          </div>
          <p className="text-xs text-gray">
            {t('Quản lý hồ sơ đã gửi, tìm kiếm chuyên gia và phân công hoặc đổi người thẩm định chuyên môn.')}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          title={t('Tải lại dữ liệu')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs self-start sm:self-auto shrink-0"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            refresh
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1">
        <button
          type="button"
          data-testid="tab-actionable"
          onClick={() => handleTabChange('ACTIONABLE')}
          className={`pb-2.5 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'ACTIONABLE'
              ? 'border-navy text-navy dark:border-blue dark:text-blue'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          {t('Cần xử lý')}
        </button>

        <button
          type="button"
          data-testid="tab-submitted"
          onClick={() => handleTabChange('SUBMITTED')}
          className={`pb-2.5 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'SUBMITTED'
              ? 'border-navy text-navy dark:border-blue dark:text-blue'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          {t('Chờ phân công')}
        </button>

        <button
          type="button"
          data-testid="tab-in-review"
          onClick={() => handleTabChange('IN_REVIEW')}
          className={`pb-2.5 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'IN_REVIEW'
              ? 'border-navy text-navy dark:border-blue dark:text-blue'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          {t('Đang thẩm định')}
        </button>

        <button
          type="button"
          data-testid="tab-terminal"
          onClick={() => handleTabChange('TERMINAL')}
          className={`pb-2.5 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'TERMINAL'
              ? 'border-navy text-navy dark:border-blue dark:text-blue'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          {t('Đã có kết quả')}
        </button>
      </div>

      {/* Sub-status filter for Terminal Tab */}
      {activeTab === 'TERMINAL' && (
        <div className="flex items-center gap-2 pt-1 flex-wrap" data-testid="terminal-status-filter-group">
          <span className="text-xs text-gray font-medium">{t('Lọc kết quả')}:</span>
          {(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'WITHDRAWN'] as const).map(st => (
            <button
              key={st}
              type="button"
              data-testid={`terminal-filter-${st}`}
              onClick={() => {
                setTerminalStatus(st);
                setPage(0);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                terminalStatus === st
                  ? 'border-navy bg-navy/10 text-navy dark:border-blue dark:bg-blue/10 dark:text-blue shadow-2xs'
                  : 'border-border bg-surface text-gray hover:text-text hover:bg-bg'
              }`}
            >
              {st === 'APPROVED'
                ? t('Đã duyệt (APPROVED)')
                : st === 'CHANGES_REQUESTED'
                ? t('Yêu cầu sửa (CHANGES_REQUESTED)')
                : st === 'REJECTED'
                ? t('Từ chối (REJECTED)')
                : t('Đã rút (WITHDRAWN)')}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : submissions.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface p-6 shadow-2xs space-y-2">
          <span aria-hidden="true" className="material-symbols-outlined text-gray text-4xl">
            assignment_turned_in
          </span>
          <h2 className="text-base font-bold text-text">{t('Hàng đợi trống')}</h2>
          <p className="text-xs text-gray max-w-md mx-auto">
            {activeTab === 'SUBMITTED'
              ? t('Hiện không có hồ sơ nào đang chờ phân công thẩm định.')
              : activeTab === 'IN_REVIEW'
              ? t('Hiện không có hồ sơ nào đang trong tiến trình thẩm định.')
              : t('Không có hồ sơ nào trong mục này.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg/60 border-b border-border text-gray font-semibold">
                  <tr>
                    <th scope="col" className="p-3.5 pl-5">{t('Hồ sơ tri thức')}</th>
                    <th scope="col" className="p-3.5">{t('Phiên bản')}</th>
                    <th scope="col" className="p-3.5">{t('Trạng thái')}</th>
                    <th scope="col" className="p-3.5">{t('Thời gian gửi')}</th>
                    <th scope="col" className="p-3.5 pr-5 text-right">{t('Thao tác')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map(item => (
                    <tr
                      key={item.id}
                      data-testid={`submission-row-${item.id}`}
                      className="hover:bg-bg/40 transition-colors"
                    >
                      <td className="p-3.5 pl-5">
                        <Link
                          to={`/knowledge/sources/${item.sourceId}`}
                          className="font-bold text-text hover:text-navy dark:hover:text-blue hover:underline [overflow-wrap:anywhere] block"
                        >
                          {item.title}
                        </Link>
                        <div className="text-[11px] font-mono text-gray mt-0.5">
                          ID: {item.sourceId.slice(0, 8)}...
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap font-mono text-gray">
                        <span className="font-semibold text-text">Rev #{item.revisionNumber}</span>
                        <span className="text-[11px] block">v{item.version}</span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <KnowledgeStatusBadge status={item.status} size="sm" />
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-gray font-mono">
                        {formatDate(item.submittedAt || item.updatedAt)}
                      </td>

                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'SUBMITTED' && (
                            <button
                              type="button"
                              data-testid={`assign-button-${item.id}`}
                              onClick={() => handleOpenAssign(item)}
                              className="px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-semibold hover:opacity-95 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                                person_add
                              </span>
                              <span>{t('Phân công')}</span>
                            </button>
                          )}

                          {item.status === 'IN_REVIEW' && (
                            <button
                              type="button"
                              data-testid={`reassign-button-${item.id}`}
                              disabled={loadingTargetDetailRevId === item.id}
                              onClick={() => handleOpenReassign(item)}
                              className="px-3 py-1.5 rounded-lg bg-amber/15 border border-amber/40 text-amber hover:bg-amber/25 text-xs font-semibold shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                                published_with_changes
                              </span>
                              <span>{t('Đổi người')}</span>
                            </button>
                          )}

                          <Link
                            to={`/knowledge/sources/${item.sourceId}`}
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-bg text-xs font-semibold shadow-2xs inline-flex items-center gap-1"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-sm">
                              visibility
                            </span>
                            <span>{t('Xem')}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray pt-2">
              <span>
                {t('Tổng số')}: {totalElements} {t('hồ sơ')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
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
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
                >
                  {t('Sau')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {assignTarget && (
        <AdminAssignReviewerModal
          revision={assignTarget}
          isOpen={Boolean(assignTarget)}
          onClose={handleCloseAssign}
          onSuccess={handleAssignSuccess}
          onReload={handleReloadAssignTarget}
          mustVerifyReload={Boolean(indeterminateLocks[`assign-${assignTarget.id}`])}
          onIndeterminateError={() =>
            setIndeterminateLocks(prev => ({ ...prev, [`assign-${assignTarget.id}`]: true }))
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
            setIndeterminateLocks(prev => ({ ...prev, [`reassign-${reassignTarget.revision.id}`]: true }))
          }
        />
      )}
    </div>
  );
}
