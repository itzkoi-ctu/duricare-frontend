import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import { listPublications, getPublicationHead, getPublicationDetail, getOperationReceipt, parsePublicationError } from '../../../api/publication';
import type {
  PublicationSummary,
  PublicationStatus,
  PublicationHead,
  MutationReceipt,
  JobKind,
  IndeterminateOperation,
} from '../../../types/publication';
import PublicationStatusBadge from './PublicationStatusBadge';
import PublicationDetailModal from './PublicationDetailModal';
import RevokePublicationModal from './RevokePublicationModal';
import RetryPublicationModal from './RetryPublicationModal';
import LoadingState from '../../LoadingState';
import ErrorState from '../../ErrorState';

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} UTC+7`;
  } catch {
    return '';
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return iso;
  }
}

type StatusFilter = 'ALL' | PublicationStatus;

export default function AdminPublicationsTab() {
  useLanguage();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [publications, setPublications] = useState<PublicationSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Selected publication for inspection
  const [inspectPublicationId, setInspectPublicationId] = useState<string | null>(null);

  // Revoke modal state
  const [isRevokeOpen, setIsRevokeOpen] = useState<boolean>(false);
  const [revokeTarget, setRevokeTarget] = useState<PublicationSummary | null>(null);
  const [revokeHead, setRevokeHead] = useState<PublicationHead | null>(null);
  const [revokeModalSession, setRevokeModalSession] = useState<number>(0);

  // Retry modal state
  const [isRetryOpen, setIsRetryOpen] = useState<boolean>(false);
  const [retryTarget, setRetryTarget] = useState<{
    targetId: string;
    sourceId: string;
    kind: JobKind;
    title: string;
  } | null>(null);
  const [retryHead, setRetryHead] = useState<PublicationHead | null>(null);
  const [retryModalSession, setRetryModalSession] = useState<number>(0);

  // Indeterminate operations tracking by targetId (publicationId or jobId)
  const [indeterminateOps, setIndeterminateOps] = useState<Record<string, IndeterminateOperation>>({});

  const isMountedRef = useRef<boolean>(true);
  const sessionRef = useRef<number>(0);
  const activeRequestRef = useRef<AbortController | null>(null);

  // Session and target refs to guard against delayed callbacks / cross-modal interference
  const revokeSessionRef = useRef<number>(0);
  const currentRevokeTargetIdRef = useRef<string | null>(null);
  const openRevokeSessionRef = useRef<number>(0);

  const retrySessionRef = useRef<number>(0);
  const currentRetryTargetIdRef = useRef<string | null>(null);

  const loadPublications = useCallback(async () => {
    sessionRef.current += 1;
    const session = sessionRef.current;
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);

    const queryStatus = statusFilter === 'ALL' ? undefined : statusFilter;

    try {
      const res = await listPublications(
        {
          page,
          size: 15,
          status: queryStatus,
        },
        controller.signal
      );

      if (!isMountedRef.current || sessionRef.current !== session) return;

      setPublications(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      setLoading(false);
    } catch (err: unknown) {
      if (!isMountedRef.current || sessionRef.current !== session) return;
      const parsed = parsePublicationError(err, t('Không thể tải danh sách xuất bản RAG.'));
      setError(parsed.message);
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    isMountedRef.current = true;
    loadPublications().catch(() => {});
    return () => {
      isMountedRef.current = false;
      activeRequestRef.current?.abort();
    };
  }, [loadPublications]);

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(0);
  };

  const handleOpenRevoke = async (pub: PublicationSummary) => {
    openRevokeSessionRef.current += 1;
    const openSession = openRevokeSessionRef.current;
    try {
      const head = await getPublicationHead(pub.sourceId);
      if (!isMountedRef.current || openRevokeSessionRef.current !== openSession) {
        return;
      }
      revokeSessionRef.current += 1;
      const modalSession = revokeSessionRef.current;
      currentRevokeTargetIdRef.current = pub.id;
      setRevokeModalSession(modalSession);
      setRevokeHead(head);
      setRevokeTarget(pub);
      setIsRevokeOpen(true);
    } catch (err) {
      if (!isMountedRef.current || openRevokeSessionRef.current !== openSession) {
        return;
      }
      const parsed = parsePublicationError(err, t('Không thể lấy phiên bản xuất bản hiện tại.'));
      setError(parsed.message);
    }
  };

  const handleCloseRevoke = () => {
    revokeSessionRef.current += 1;
    openRevokeSessionRef.current += 1;
    currentRevokeTargetIdRef.current = null;
    setIsRevokeOpen(false);
    setRevokeTarget(null);
    setRevokeHead(null);
  };

  const handleCloseRetry = () => {
    retrySessionRef.current += 1;
    currentRetryTargetIdRef.current = null;
    setIsRetryOpen(false);
    setRetryTarget(null);
    setRetryHead(null);
  };

  const handleVerifyReceipt = async (
    targetId: string,
    sourceId: string,
    modalContext?: { kind: 'revoke' | 'retry'; sessionId: number }
  ) => {
    const op = indeterminateOps[targetId];
    if (!op) return;
    try {
      const receipt = await getOperationReceipt(op.requestId);
      let isConfirmed = false;
      if (receipt && receipt.response && receipt.requestId === op.requestId && receipt.operation === op.operation) {
        if (op.operation === 'REVOKE') {
          if (receipt.response.publication?.id === op.targetId) {
            isConfirmed = true;
          }
        } else if (op.operation === 'RETRY_INDEX' || op.operation === 'RETRY_CLEANUP') {
          if (
            receipt.response.job?.id === op.targetId ||
            receipt.response.publication?.id === op.targetId
          ) {
            isConfirmed = true;
          }
        } else {
          isConfirmed = true;
        }
      }

      if (isConfirmed && receipt && receipt.response) {
        // Operation completed/committed on server.
        // Reconcile indeterminate state for targetId
        setIndeterminateOps((prev) => {
          if (!prev[targetId]) return prev;
          const next = { ...prev };
          delete next[targetId];
          return next;
        });

        // Trigger table refresh so list shows latest state
        loadPublications().catch(() => {});

        // Only close/reset modal if the target and session match the active modal context
        if (modalContext) {
          if (
            modalContext.kind === 'revoke' &&
            revokeSessionRef.current === modalContext.sessionId &&
            currentRevokeTargetIdRef.current === targetId
          ) {
            revokeSessionRef.current += 1;
            openRevokeSessionRef.current += 1;
            currentRevokeTargetIdRef.current = null;
            setIsRevokeOpen(false);
            setRevokeTarget(null);
            setRevokeHead(null);
          } else if (
            modalContext.kind === 'retry' &&
            retrySessionRef.current === modalContext.sessionId &&
            currentRetryTargetIdRef.current === targetId
          ) {
            retrySessionRef.current += 1;
            currentRetryTargetIdRef.current = null;
            setIsRetryOpen(false);
            setRetryTarget(null);
            setRetryHead(null);
          }
        }
        return receipt.response;
      }
    } catch (err: unknown) {
      const parsed = parsePublicationError(err, '');
      if (parsed.status === 404) {
        // Receipt 404: Receipt record not found yet.
        // Per baseline policy: Receipt 404 does NOT prove operation was not committed.
        // Maintain indeterminate lock unless head version confirms server state moved.
        let isConfirmed = false;
        let freshHead: PublicationHead | null = null;

        if (op.operation === 'REVOKE') {
          const [detailRes, headRes] = await Promise.all([
            getPublicationDetail(op.targetId),
            getPublicationHead(sourceId),
          ]);
          if (!isMountedRef.current) return;
          freshHead = headRes;

          // Strict confirmation criteria:
          // Concrete proof of REVOKED status required:
          // 1. Target publication status is strictly REVOKED
          // 2. Target is not in activePublicationId
          // 3. Target is not in pendingPublicationId
          if (
            detailRes.publication.id === op.targetId &&
            detailRes.publication.status === 'REVOKED' &&
            freshHead.activePublicationId !== op.targetId &&
            freshHead.pendingPublicationId !== op.targetId
          ) {
            isConfirmed = true;
          } else {
            isConfirmed = false;
          }
        } else if (
          op.operation === 'RETRY_INDEX' ||
          op.operation === 'RETRY_CLEANUP' ||
          op.operation === 'PUBLISH'
        ) {
          freshHead = await getPublicationHead(sourceId);
          if (!isMountedRef.current) return;
          if (freshHead.version > op.version) {
            isConfirmed = true;
          }
        }

        if (isConfirmed) {
          // Version moved, server state advanced and confirmed
          setIndeterminateOps((prev) => {
            if (!prev[targetId]) return prev;
            const next = { ...prev };
            delete next[targetId];
            return next;
          });
          loadPublications().catch(() => {});

          if (modalContext) {
            if (
              modalContext.kind === 'revoke' &&
              revokeSessionRef.current === modalContext.sessionId &&
              currentRevokeTargetIdRef.current === targetId
            ) {
              revokeSessionRef.current += 1;
              openRevokeSessionRef.current += 1;
              currentRevokeTargetIdRef.current = null;
              setIsRevokeOpen(false);
              setRevokeTarget(null);
              setRevokeHead(null);
            } else if (
              modalContext.kind === 'retry' &&
              retrySessionRef.current === modalContext.sessionId &&
              currentRetryTargetIdRef.current === targetId
            ) {
              retrySessionRef.current += 1;
              currentRetryTargetIdRef.current = null;
              setIsRetryOpen(false);
              setRetryTarget(null);
              setRetryHead(null);
            }
          }
        } else {
          // Not confirmed: keep lock and update modal head version for inspection
          if (freshHead && modalContext) {
            if (
              modalContext.kind === 'revoke' &&
              revokeSessionRef.current === modalContext.sessionId &&
              currentRevokeTargetIdRef.current === targetId
            ) {
              setRevokeHead(freshHead);
            } else if (
              modalContext.kind === 'retry' &&
              retrySessionRef.current === modalContext.sessionId &&
              currentRetryTargetIdRef.current === targetId
            ) {
              setRetryHead(freshHead);
            }
          }
        }

        return freshHead;
      } else {
        throw err;
      }
    }
  };

  const handleRevokeModalSuccess = (
    _receipt: MutationReceipt,
    targetId: string,
    session: number
  ) => {
    // Reconcile indeterminate operation for this targetId
    setIndeterminateOps((prev) => {
      if (!prev[targetId]) return prev;
      const next = { ...prev };
      delete next[targetId];
      return next;
    });

    // Only close and reset if the revoke modal is still on this exact session and target
    if (
      revokeSessionRef.current === session &&
      currentRevokeTargetIdRef.current === targetId
    ) {
      revokeSessionRef.current += 1;
      openRevokeSessionRef.current += 1;
      currentRevokeTargetIdRef.current = null;
      setIsRevokeOpen(false);
      setRevokeTarget(null);
      setRevokeHead(null);
    }
    loadPublications().catch(() => {});
  };

  const handleRetryModalSuccess = (
    _receipt: MutationReceipt,
    targetId: string,
    session: number
  ) => {
    // Reconcile indeterminate operation for this targetId
    setIndeterminateOps((prev) => {
      if (!prev[targetId]) return prev;
      const next = { ...prev };
      delete next[targetId];
      return next;
    });

    // Only close and reset if the retry modal is still on this exact session and target
    if (
      retrySessionRef.current === session &&
      currentRetryTargetIdRef.current === targetId
    ) {
      retrySessionRef.current += 1;
      currentRetryTargetIdRef.current = null;
      setIsRetryOpen(false);
      setRetryTarget(null);
      setRetryHead(null);
    }
    loadPublications().catch(() => {});
  };

  return (
    <div className="space-y-4" data-testid="admin-publications-tab-content">
      {/* 1. Sub-Header Info Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs">
        <div>
          <h2 id="rag-section-title" className="text-[16px] font-semibold text-[#1e293b]">
            {t('Xuất bản vào RAG')}
          </h2>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            {t('Theo dõi các bản tri thức đã yêu cầu xuất bản và trạng thái sử dụng trong truy vấn.')}
          </p>
        </div>
        <button
          type="button"
          data-testid="refresh-publications-button"
          onClick={() => loadPublications()}
          className="inline-flex items-center justify-center gap-2 px-3.5 h-[44px] min-h-[44px] rounded-lg border border-[#e2e8f0] bg-white text-[13px] font-medium text-[#1e293b] hover:bg-[#f8f9ff] hover:text-[#1f5ca9] hover:border-[#cbdbf5] transition-colors shrink-0 cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{t('Làm mới luồng')}</span>
        </button>
      </div>

      {/* 2. Toolbar: Status Select Filter + Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-[#e2e8f0] shadow-2xs">
        <div className="flex items-center gap-3" data-testid="publication-status-filter-group" data-preview-filter="true">
          <label htmlFor="filter-status" className="text-[13px] font-medium text-[#64748b] shrink-0">
            {t('Trạng thái xuất bản')}:
          </label>
          <div className="relative inline-block">
            <select
              id="filter-status"
              data-testid="publication-status-select"
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as StatusFilter)}
              className="h-[44px] min-h-[44px] pl-3 pr-8 rounded-lg border border-[#e2e8f0] bg-white text-[14px] text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#1f5ca9] focus:border-[#1f5ca9] appearance-none cursor-pointer"
            >
              <option value="ALL" data-testid="publication-filter-all">
                {t('Tất cả trạng thái')}
              </option>
              <option value="ACTIVE" data-testid="publication-filter-active">
                ACTIVE ({t('Đang phục vụ RAG')})
              </option>
              <option value="PENDING" data-testid="publication-filter-pending">
                PENDING ({t('Chờ hoàn tất')})
              </option>
              <option value="SUPERSEDED" data-testid="publication-filter-superseded">
                SUPERSEDED ({t('Đã thay thế')})
              </option>
              <option value="REVOKED" data-testid="publication-filter-revoked">
                REVOKED ({t('Đã thu hồi')})
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#64748b]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="text-[13px] text-[#64748b]">
          {t('Bộ lọc')}: <span className="font-medium text-[#1e293b]">{totalElements} {t('bản xuất bản')}</span>
        </div>
      </div>

      {/* 3. Main Content Area */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPublications} />
      ) : publications.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-[#e2e8f0] bg-white p-6 shadow-2xs space-y-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[#64748b] text-4xl">
            database
          </span>
          <h3 className="text-sm font-bold text-[#1e293b]">{t('Không có bản xuất bản nào')}</h3>
          <p className="text-xs text-[#64748b]">
            {t('Chưa có bản ghi xuất bản nào phù hợp với bộ lọc đã chọn.')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-2xs">
          {/* 3.1 Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto" data-testid="publications-table">
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8f9ff] text-[12px] font-semibold text-[#64748b] tracking-wider uppercase">
                  <th scope="col" className="py-3.5 px-4 w-[38%]">
                    {t('Nguồn tri thức & Tài liệu')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-[20%]">
                    {t('Phiên bản · Tầng · Quy mô')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-[18%]">
                    {t('Trạng thái RAG')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-[14%]">
                    {t('Thời điểm tạo')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-[10%] text-right">
                    {t('Thao tác')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-[14px]">
                {publications.map((item) => (
                  <tr
                    key={item.id}
                    data-testid={`publication-row-${item.id}`}
                    className="hover:bg-[#f8f9ff] transition-colors"
                  >
                    {/* Cột 1: Nguồn tri thức & Tài liệu (38%) */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        <Link
                          to={`/knowledge/sources/${item.sourceId}`}
                          className="font-semibold text-[#1e293b] hover:text-[#0072a8] leading-snug line-clamp-2"
                          title={item.sourceTitle}
                        >
                          {item.sourceTitle}
                        </Link>
                        <details className="text-[12px] mt-1 text-[#64748b] group">
                          <summary className="cursor-pointer text-[12px] text-[#0072a8] hover:underline inline-flex items-center gap-1 font-medium select-none min-h-[44px]">
                            <span>{t('Chi tiết kỹ thuật')}</span>
                            <svg className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="mt-2 p-2 bg-[#f8f9ff] border border-[#e2e8f0] rounded-md font-mono text-[11px] text-[#475569] space-y-1">
                            <div>publicationId: <span className="text-[#1e293b]">{item.id}</span></div>
                            <div>revisionId: <span className="text-[#1e293b]">{item.revisionId}</span></div>
                            <div>latestJobId: <span className="text-[#1e293b]">{item.latestJobId || '—'}</span></div>
                          </div>
                        </details>
                      </div>
                    </td>

                    {/* Cột 2: Phiên bản · Tầng · Quy mô (20%) */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            data-preview-badge="true"
                            className="inline-flex items-center h-6 min-h-[24px] px-2 py-0.5 rounded-[6px] text-[12px] font-medium bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]"
                          >
                            {t('Bản {0}', [item.revisionNumber])}{' '}
                            <span className="text-[#64748b] ml-1">(gen {item.generation})</span>
                          </span>
                          <span
                            data-preview-badge="true"
                            className="inline-flex items-center h-6 min-h-[24px] px-2 py-0.5 rounded-[6px] text-[12px] font-semibold bg-[#eff4ff] text-[#1f5ca9] border border-[#cbdbf5]"
                          >
                            {t('Tầng {0}', [item.assessedTier || 'A'])}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#64748b]">
                          {t('Quy mô')}: <span className="font-medium text-[#1e293b]">{item.chunkCount} {t('đoạn trích')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Trạng thái RAG (18%) */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        <PublicationStatusBadge status={item.status} size="sm" />
                        <span className="text-[11px] text-[#64748b] font-mono">{item.status}</span>
                      </div>
                    </td>

                    {/* Cột 4: Thời điểm tạo (14%) */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-col text-[13px] text-[#1e293b]">
                        <span>{formatDateOnly(item.createdAt)}</span>
                        <span className="text-[12px] text-[#64748b]">{formatTimeOnly(item.createdAt)}</span>
                      </div>
                    </td>

                    {/* Cột 5: Thao tác (10%) */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {indeterminateOps[item.id] && (
                          <span
                            data-testid={`indeterminate-lock-badge-${item.id}`}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                            title={t('Thao tác trước đó chưa rõ kết quả')}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-xs">
                              sync_problem
                            </span>
                            <span>{t('Chờ xác minh')}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          data-testid={`inspect-pub-${item.id}`}
                          onClick={() => setInspectPublicationId(item.id)}
                          className="inline-flex items-center justify-center px-3.5 h-[44px] min-h-[44px] rounded-lg bg-white border border-[#e2e8f0] text-[13px] font-medium text-[#1e293b] hover:bg-[#eff4ff] hover:text-[#1f5ca9] hover:border-[#cbdbf5] transition-colors cursor-pointer"
                        >
                          {t('Chi tiết')}
                        </button>
                        {item.status !== 'REVOKED' && (
                          <button
                            type="button"
                            data-testid={`revoke-pub-${item.id}`}
                            onClick={() => handleOpenRevoke(item)}
                            className="text-[12px] font-medium text-rose-600 hover:text-rose-700 hover:underline px-1 py-1 min-h-[44px] cursor-pointer inline-flex items-center"
                          >
                            {t('Thu hồi')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3.2 Responsive Mobile Card Stack (< 768px) */}
          <div className="md:hidden divide-y divide-[#e2e8f0]" data-testid="publications-mobile-stack">
            {publications.map((item) => (
              <div
                key={item.id}
                data-testid={`publication-row-${item.id}`}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/knowledge/sources/${item.sourceId}`}
                    className="font-semibold text-[15px] text-[#1e293b] leading-snug"
                  >
                    {item.sourceTitle}
                  </Link>
                  <PublicationStatusBadge status={item.status} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-[12px] flex-wrap text-[#64748b]">
                  <span
                    data-preview-badge="true"
                    className="bg-[#f1f5f9] px-2 py-0.5 rounded-[6px] text-[#1e293b] font-medium border border-[#e2e8f0] h-6 min-h-[24px] inline-flex items-center"
                  >
                    {t('Bản {0}', [item.revisionNumber])}{' '}
                    <span className="text-[#64748b] ml-1">(gen {item.generation})</span>
                  </span>
                  <span
                    data-preview-badge="true"
                    className="bg-[#eff4ff] text-[#1f5ca9] font-semibold px-2 py-0.5 rounded-[6px] border border-[#cbdbf5] h-6 min-h-[24px] inline-flex items-center"
                  >
                    {t('Tầng {0}', [item.assessedTier || 'A'])}
                  </span>
                  <span>· {item.chunkCount} {t('đoạn trích')}</span>
                </div>
                <div className="text-[12px] text-[#64748b]">
                  {t('Tạo lúc')}: {formatDateTime(item.createdAt)}
                </div>
                {indeterminateOps[item.id] && (
                  <div className="pt-1">
                    <span
                      data-testid={`indeterminate-lock-badge-${item.id}`}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-xs">
                        sync_problem
                      </span>
                      <span>{t('Chờ xác minh')}</span>
                    </span>
                  </div>
                )}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectPublicationId(item.id)}
                    className="w-full h-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[14px] font-medium text-[#1e293b] hover:bg-[#eff4ff] hover:text-[#1f5ca9] transition-colors cursor-pointer"
                  >
                    {t('Chi tiết')}
                  </button>
                  {item.status !== 'REVOKED' && (
                    <button
                      type="button"
                      onClick={() => handleOpenRevoke(item)}
                      className="w-full text-center py-2 text-[13px] font-medium text-rose-600 hover:text-rose-700 min-h-[44px] cursor-pointer inline-flex items-center justify-center"
                    >
                      {t('Thu hồi xuất bản')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 3.3 Server Pagination Footer */}
          <div className="px-4 py-3 bg-[#f8f9ff] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#64748b]">
            <div>
              {t('Hiển thị')}{' '}
              <span className="font-medium text-[#1e293b]">
                {publications.length > 0 ? page * 15 + 1 : 0} - {Math.min((page + 1) * 15, totalElements)}
              </span>{' '}
              {t('trong tổng số')}{' '}
              <span className="font-medium text-[#1e293b]">{totalElements}</span> {t('bản ghi')} (15 {t('bản ghi / trang')})
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label={t('Trang trước')}
                className="px-2.5 h-[36px] min-h-[44px] rounded-lg border border-[#e2e8f0] bg-white text-[#94a3b8] hover:text-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 h-[36px] min-h-[44px] rounded-lg bg-white border border-[#cbdbf5] text-[#1f5ca9] font-semibold text-[13px] inline-flex items-center justify-center shadow-2xs">
                {page + 1}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label={t('Trang sau')}
                className="px-2.5 h-[36px] min-h-[44px] rounded-lg border border-[#e2e8f0] bg-white text-[#94a3b8] hover:text-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modals */}
      {inspectPublicationId && (
        <PublicationDetailModal
          publicationId={inspectPublicationId}
          isOpen={Boolean(inspectPublicationId)}
          onClose={() => setInspectPublicationId(null)}
          onRequestRevoke={(pub, head) => {
            setInspectPublicationId(null);
            openRevokeSessionRef.current += 1;
            revokeSessionRef.current += 1;
            const modalSession = revokeSessionRef.current;
            currentRevokeTargetIdRef.current = pub.id;
            setRevokeModalSession(modalSession);
            setRevokeHead(head);
            setRevokeTarget(pub);
            setIsRevokeOpen(true);
          }}
          onRequestRetry={(targetId, kind, head, title) => {
            setInspectPublicationId(null);
            retrySessionRef.current += 1;
            const modalSession = retrySessionRef.current;
            currentRetryTargetIdRef.current = targetId;
            setRetryModalSession(modalSession);
            setRetryHead(head);
            setRetryTarget({ targetId, sourceId: head.sourceId, kind, title });
            setIsRetryOpen(true);
          }}
        />
      )}

      {isRevokeOpen && revokeTarget && revokeHead && (
        <RevokePublicationModal
          publication={revokeTarget}
          head={revokeHead}
          isOpen={isRevokeOpen}
          onClose={handleCloseRevoke}
          onSuccess={(receipt) => {
            handleRevokeModalSuccess(receipt, revokeTarget.id, revokeModalSession);
          }}
          onReloadHead={async () => {
            const capturedSession = revokeModalSession;
            const capturedTargetId = revokeTarget.id;
            const capturedSourceId = revokeTarget.sourceId;
            if (indeterminateOps[capturedTargetId]) {
              await handleVerifyReceipt(capturedTargetId, capturedSourceId, {
                kind: 'revoke',
                sessionId: capturedSession,
              });
            }
            const fresh = await getPublicationHead(capturedSourceId);
            if (
              isMountedRef.current &&
              revokeSessionRef.current === capturedSession &&
              currentRevokeTargetIdRef.current === capturedTargetId
            ) {
              setRevokeHead(fresh);
            }
            return fresh;
          }}
          indeterminateLock={Boolean(indeterminateOps[revokeTarget.id])}
          preservedRequestId={indeterminateOps[revokeTarget.id]?.requestId}
          preservedReason={indeterminateOps[revokeTarget.id]?.reason}
          onIndeterminateError={(op) => {
            if (op) {
              const capturedTargetId = revokeTarget.id;
              setIndeterminateOps((prev) => ({ ...prev, [capturedTargetId]: op }));
            }
          }}
          onVerifyReceipt={() =>
            handleVerifyReceipt(revokeTarget.id, revokeTarget.sourceId, {
              kind: 'revoke',
              sessionId: revokeModalSession,
            })
          }
        />
      )}

      {isRetryOpen && retryTarget && retryHead && (
        <RetryPublicationModal
          targetId={retryTarget.targetId}
          kind={retryTarget.kind}
          head={retryHead}
          title={retryTarget.title}
          isOpen={isRetryOpen}
          onClose={handleCloseRetry}
          onSuccess={(receipt) => {
            handleRetryModalSuccess(receipt, retryTarget.targetId, retryModalSession);
          }}
          onReloadHead={async () => {
            const capturedSession = retryModalSession;
            const capturedTargetId = retryTarget.targetId;
            const capturedSourceId = retryTarget.sourceId;
            if (indeterminateOps[capturedTargetId]) {
              await handleVerifyReceipt(capturedTargetId, capturedSourceId, {
                kind: 'retry',
                sessionId: capturedSession,
              });
            }
            const fresh = await getPublicationHead(capturedSourceId);
            if (
              isMountedRef.current &&
              retrySessionRef.current === capturedSession &&
              currentRetryTargetIdRef.current === capturedTargetId
            ) {
              setRetryHead(fresh);
            }
            return fresh;
          }}
          indeterminateLock={Boolean(indeterminateOps[retryTarget.targetId])}
          preservedRequestId={indeterminateOps[retryTarget.targetId]?.requestId}
          preservedReason={indeterminateOps[retryTarget.targetId]?.reason}
          onIndeterminateError={(op) => {
            if (op) {
              const capturedTargetId = retryTarget.targetId;
              setIndeterminateOps((prev) => ({ ...prev, [capturedTargetId]: op }));
            }
          }}
          onVerifyReceipt={() =>
            handleVerifyReceipt(retryTarget.targetId, retryTarget.sourceId, {
              kind: 'retry',
              sessionId: retryModalSession,
            })
          }
        />
      )}
    </div>
  );
}
