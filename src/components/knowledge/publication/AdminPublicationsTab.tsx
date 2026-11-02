import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import { listPublications, getPublicationHead, getOperationReceipt, parsePublicationError } from '../../../api/publication';
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
      if (receipt && receipt.response) {
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
        // Server did not receive/commit this operation.
        // Confirm by reading back publication head.
        try {
          const freshHead = await getPublicationHead(sourceId);
          if (!isMountedRef.current) return;

          // Reconcile indeterminate state
          setIndeterminateOps((prev) => {
            if (!prev[targetId]) return prev;
            const next = { ...prev };
            delete next[targetId];
            return next;
          });

          if (freshHead.version !== op.version) {
            // Version moved due to another mutation
            loadPublications().catch(() => {});
          }

          // If the modal for THIS target is still open in THIS session, update head
          if (modalContext) {
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
          return freshHead;
        } catch {
          // If network still fails, keep locked
        }
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
      {/* Sub-status Filter Buttons */}
      <div className="flex items-center gap-2 pt-1 flex-wrap" data-testid="publication-status-filter-group">
        <span className="text-xs text-gray font-medium">{t('Lọc trạng thái')}:</span>
        {(['ALL', 'ACTIVE', 'PENDING', 'SUPERSEDED', 'REVOKED'] as const).map((st) => (
          <button
            key={st}
            type="button"
            data-testid={`publication-filter-${st.toLowerCase()}`}
            onClick={() => handleFilterChange(st)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === st
                ? 'border-navy bg-navy/10 text-navy dark:border-blue dark:bg-blue/10 dark:text-blue shadow-2xs'
                : 'border-border bg-surface text-gray hover:text-text hover:bg-bg'
            }`}
          >
            {st === 'ALL'
              ? t('Tất cả')
              : st === 'ACTIVE'
              ? t('Đang hoạt động (ACTIVE)')
              : st === 'PENDING'
              ? t('Chờ xử lý (PENDING)')
              : st === 'SUPERSEDED'
              ? t('Đã thay thế (SUPERSEDED)')
              : t('Đã thu hồi (REVOKED)')}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPublications} />
      ) : publications.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface p-6 shadow-2xs space-y-2">
          <span aria-hidden="true" className="material-symbols-outlined text-gray text-4xl">
            database
          </span>
          <h3 className="text-sm font-bold text-text">{t('Không có bản xuất bản nào')}</h3>
          <p className="text-xs text-gray">
            {t('Chưa có bản ghi xuất bản nào phù hợp với bộ lọc đã chọn.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="publications-table">
                <thead className="border-b border-border bg-bg/50 text-gray uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">{t('Nguồn tri thức')}</th>
                    <th scope="col" className="px-4 py-3">{t('Phiên bản')}</th>
                    <th scope="col" className="px-4 py-3">{t('Tầng tin cậy')}</th>
                    <th scope="col" className="px-4 py-3">{t('Số chunks')}</th>
                    <th scope="col" className="px-4 py-3">{t('Trạng thái')}</th>
                    <th scope="col" className="px-4 py-3">{t('Ngày tạo')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('Thao tác')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {publications.map((item) => (
                    <tr
                      key={item.id}
                      data-testid={`publication-row-${item.id}`}
                      className="hover:bg-bg/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-text line-clamp-1 [overflow-wrap:anywhere]" title={item.sourceTitle}>
                          {item.sourceTitle}
                        </div>
                        <div className="text-[10px] text-gray font-mono mt-0.5 truncate" title={item.id}>
                          ID: {item.id}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-text whitespace-nowrap">
                        <span>Rev #{item.revisionNumber}</span>
                        <span className="text-gray text-[10px] block">Gen #{item.generation}</span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-teal px-2 py-0.5 rounded bg-teal/10 border border-teal/20">
                          {item.assessedTier}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-text whitespace-nowrap">
                        {item.chunkCount}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PublicationStatusBadge status={item.status} size="sm" />
                      </td>

                      <td className="px-4 py-3.5 font-mono text-gray whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {indeterminateOps[item.id] && (
                            <span
                              data-testid={`indeterminate-lock-badge-${item.id}`}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1"
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
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-bg font-semibold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-sm">
                              visibility
                            </span>
                            <span>{t('Chi tiết')}</span>
                          </button>

                          {item.status !== 'REVOKED' && (
                            <button
                              type="button"
                              data-testid={`revoke-pub-${item.id}`}
                              onClick={() => handleOpenRevoke(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-coral/30 bg-coral/10 hover:bg-coral/20 text-coral font-semibold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                                block
                              </span>
                              <span>{t('Thu hồi')}</span>
                            </button>
                          )}

                          <Link
                            to={`/knowledge/sources/${item.sourceId}`}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-bg font-semibold shadow-2xs inline-flex items-center gap-1"
                            title={t('Xem chi tiết nguồn')}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-sm">
                              open_in_new
                            </span>
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
                {t('Tổng số')}: {totalElements} {t('bản ghi')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
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
