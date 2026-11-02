import { useState, useEffect, useRef, useCallback } from 'react';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import { getPublicationHead, getPublicationDetail, getOperationReceipt, parsePublicationError } from '../../../api/publication';
import type {
  PublicationHead,
  PublicationSummary,
  MutationReceipt,
  JobKind,
  IndeterminateOperation,
} from '../../../types/publication';
import type { RevisionResponse, SourceResponse } from '../../../types/governance';
import PublicationStatusBadge from './PublicationStatusBadge';
import PublishRevisionModal from './PublishRevisionModal';
import RevokePublicationModal from './RevokePublicationModal';
import RetryPublicationModal from './RetryPublicationModal';
import PublicationDetailModal from './PublicationDetailModal';

interface PublicationHeadCardProps {
  source: SourceResponse;
  currentRevision: RevisionResponse | null;
  isAdmin: boolean;
  onPublicationChanged?: () => void;
}

export default function PublicationHeadCard({
  source,
  currentRevision,
  isAdmin,
  onPublicationChanged,
}: PublicationHeadCardProps) {
  useLanguage();

  const [head, setHead] = useState<PublicationHead | null>(null);
  const [activePublication, setActivePublication] = useState<PublicationSummary | null>(null);
  const [pendingPublication, setPendingPublication] = useState<PublicationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active modal state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState<boolean>(false);
  const [revokeTarget, setRevokeTarget] = useState<PublicationSummary | null>(null);

  const [isRetryModalOpen, setIsRetryModalOpen] = useState<boolean>(false);
  const [retryTarget, setRetryTarget] = useState<{
    targetId: string;
    kind: JobKind;
    title: string;
  } | null>(null);

  const [inspectPublicationId, setInspectPublicationId] = useState<string | null>(null);

  // Indeterminate lock state & operation tracking
  const [indeterminateOp, setIndeterminateOp] = useState<IndeterminateOperation | null>(null);
  const [indeterminateLock, setIndeterminateLock] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const sessionRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleVerifyReceipt = useCallback(async () => {
    if (!indeterminateOp) return;
    try {
      const receipt = await getOperationReceipt(indeterminateOp.requestId);
      if (receipt && receipt.response) {
        setIndeterminateOp(null);
        setIndeterminateLock(false);
        if (receipt.operation === 'PUBLISH') {
          handlePublishSuccess(receipt.response);
        } else if (receipt.operation === 'REVOKE') {
          handleRevokeSuccess(receipt.response);
        } else {
          handleRetrySuccess(receipt.response);
        }
        return receipt.response.head;
      }
    } catch (err: unknown) {
      const parsed = parsePublicationError(err, '');
      if (parsed.status === 404) {
        try {
          const freshHead = await getPublicationHead(source.id);
          setIndeterminateOp(null);
          setIndeterminateLock(false);
          setHead(freshHead);
          return freshHead;
        } catch {
          // If readback fails, keep locked
        }
      }
    }
  }, [indeterminateOp, source.id]);

  const loadHeadAndDetails = useCallback(async () => {
    sessionRef.current += 1;
    const session = sessionRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    // If there is an unresolved indeterminate operation, verify its receipt first
    if (indeterminateOp) {
      try {
        await handleVerifyReceipt();
      } catch {
        // If receipt lookup fails, do not prematurely unlock
      }
    }

    try {
      const headRes = await getPublicationHead(source.id, controller.signal);
      if (!isMountedRef.current || sessionRef.current !== session) return;

      setHead(headRes);
      if (!indeterminateOp) {
        setIndeterminateLock(false);
      }

      // Fetch active & pending publication summaries if IDs are present
      let activePub: PublicationSummary | null = null;
      let pendingPub: PublicationSummary | null = null;

      if (headRes.activePublicationId) {
        try {
          const detailRes = await getPublicationDetail(headRes.activePublicationId, controller.signal);
          if (isMountedRef.current && sessionRef.current === session) {
            activePub = detailRes.publication;
          }
        } catch {
          // ignore or keep null
        }
      }

      if (headRes.pendingPublicationId) {
        try {
          const detailRes = await getPublicationDetail(headRes.pendingPublicationId, controller.signal);
          if (isMountedRef.current && sessionRef.current === session) {
            pendingPub = detailRes.publication;
          }
        } catch {
          // ignore or keep null
        }
      }

      if (isMountedRef.current && sessionRef.current === session) {
        setActivePublication(activePub);
        setPendingPublication(pendingPub);
        setLoading(false);
      }
      return headRes;
    } catch (err: unknown) {
      if (!isMountedRef.current || sessionRef.current !== session) return;
      const parsed = parsePublicationError(err, t('Không thể tải thông tin xuất bản RAG.'));
      setError(parsed.message);
      setLoading(false);
      throw err;
    }
  }, [source.id, indeterminateOp, handleVerifyReceipt]);

  useEffect(() => {
    isMountedRef.current = true;
    loadHeadAndDetails().catch(() => {});
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [loadHeadAndDetails]);

  // Handle successful mutations
  const handlePublishSuccess = (receipt: MutationReceipt) => {
    setIsPublishModalOpen(false);
    setIndeterminateOp(null);
    setIndeterminateLock(false);
    setHead(receipt.head);
    if (receipt.publication) {
      if (receipt.publication.status === 'PENDING') {
        setPendingPublication(receipt.publication);
      } else if (receipt.publication.status === 'ACTIVE') {
        setActivePublication(receipt.publication);
      }
    }
    loadHeadAndDetails().catch(() => {});
    onPublicationChanged?.();
  };

  const handleRevokeSuccess = (receipt: MutationReceipt) => {
    setIsRevokeModalOpen(false);
    setRevokeTarget(null);
    setIndeterminateOp(null);
    setIndeterminateLock(false);
    setHead(receipt.head);
    if (receipt.publication && receipt.publication.status === 'REVOKED') {
      setActivePublication(null);
    }
    loadHeadAndDetails().catch(() => {});
    onPublicationChanged?.();
  };

  const handleRetrySuccess = (receipt: MutationReceipt) => {
    setIsRetryModalOpen(false);
    setRetryTarget(null);
    setIndeterminateOp(null);
    setIndeterminateLock(false);
    setHead(receipt.head);
    loadHeadAndDetails().catch(() => {});
    onPublicationChanged?.();
  };

  const isCurrentRevApproved = currentRevision?.status === 'APPROVED';
  const isCurrentRevActive =
    activePublication && currentRevision && activePublication.revisionId === currentRevision.id;
  const isCurrentRevPending =
    pendingPublication && currentRevision && pendingPublication.revisionId === currentRevision.id;

  const canAdminPublishCurrent =
    !loading &&
    !error &&
    head !== null &&
    isAdmin &&
    isCurrentRevApproved &&
    !isCurrentRevActive &&
    !head?.pendingPublicationId &&
    Boolean(currentRevision) &&
    Boolean(currentRevision?.chunks?.length && currentRevision.chunks.length > 0) &&
    source.latestRevisionId === currentRevision?.id;

  const virtualHead: PublicationHead = head || {
    sourceId: source.id,
    version: 0,
    generation: 0,
    activePublicationId: null,
    pendingPublicationId: null,
    updatedAt: null,
  };

  return (
    <div
      data-testid="publication-head-card"
      className="p-4 md:p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="material-symbols-outlined text-teal text-2xl">
            database
          </span>
          <div>
            <h3 className="text-sm md:text-base font-bold text-text">
              {t('Trạng thái xuất bản RAG (DuriCare AI)')}
            </h3>
            <p className="text-[11px] text-gray">
              {t('Kiểm soát phiên bản tri thức cho trợ lý AI và cơ sở dữ liệu vector.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { loadHeadAndDetails().catch(() => {}); }}
            title={t('Tải lại trạng thái xuất bản')}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          {canAdminPublishCurrent && currentRevision && (
            <button
              type="button"
              data-testid="open-publish-modal-button"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={indeterminateLock}
              className="px-3.5 py-1.5 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer transition-opacity flex items-center gap-1.5 disabled:opacity-50"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                publish
              </span>
              <span>{t('Xuất bản vào RAG')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => { loadHeadAndDetails().catch(() => {}); }}
            className="font-semibold underline shrink-0 cursor-pointer"
          >
            {t('Thử lại')}
          </button>
        </div>
      )}

      {indeterminateLock && (
        <div data-testid="card-indeterminate-alert" className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
          <span>{t('Thao tác trước đó gặp sự cố mạng hoặc thời gian chờ (timeout). Cần xác minh biên nhận với máy chủ trước khi mở khóa.')}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="verify-receipt-button"
              onClick={() => { handleVerifyReceipt().catch(() => {}); }}
              className="px-2.5 py-1 rounded-lg bg-teal text-white font-semibold cursor-pointer shrink-0"
            >
              {t('Xác minh biên nhận')}
            </button>
            <button
              type="button"
              onClick={() => { loadHeadAndDetails().catch(() => {}); }}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer shrink-0"
            >
              {t('Tải lại head')}
            </button>
          </div>
        </div>
      )}

      {/* Main Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Publication Box */}
        <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray uppercase tracking-wider">
              {t('Bản đang hoạt động (Active)')}
            </span>
            {activePublication ? (
              <PublicationStatusBadge status={activePublication.status} size="sm" />
            ) : (
              <span className="text-xs font-mono text-gray italic">{t('Chưa có')}</span>
            )}
          </div>

          {activePublication ? (
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-text">
                <span>Rev #{activePublication.revisionNumber} (Gen #{activePublication.generation})</span>
                <span className="text-teal font-bold">{activePublication.assessedTier}</span>
              </div>
              <div className="text-[11px] text-gray truncate" title={activePublication.id}>
                ID: {activePublication.id}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="inspect-active-pub-button"
                  onClick={() => setInspectPublicationId(activePublication.id)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  {t('Xem chi tiết')}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    data-testid="revoke-active-pub-button"
                    onClick={() => {
                      setRevokeTarget(activePublication);
                      setIsRevokeModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-coral/30 bg-coral/10 hover:bg-coral/20 text-coral text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    {t('Thu hồi')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray">
              {t('Nguồn tri thức này chưa có bản xuất bản nào được kích hoạt vào cơ sở dữ liệu RAG.')}
            </p>
          )}
        </div>

        {/* Pending Publication Box */}
        <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray uppercase tracking-wider">
              {t('Bản chờ xử lý (Pending)')}
            </span>
            {pendingPublication ? (
              <PublicationStatusBadge status={pendingPublication.status} size="sm" />
            ) : (
              <span className="text-xs font-mono text-gray italic">{t('Không có')}</span>
            )}
          </div>

          {pendingPublication ? (
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-text">
                <span>Rev #{pendingPublication.revisionNumber} (Gen #{pendingPublication.generation})</span>
                <span className="text-amber-600 font-bold">{pendingPublication.assessedTier}</span>
              </div>
              <div className="text-[11px] text-gray truncate" title={pendingPublication.id}>
                ID: {pendingPublication.id}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="inspect-pending-pub-button"
                  onClick={() => setInspectPublicationId(pendingPublication.id)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  {t('Kiểm tra tiến độ tác vụ')}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    data-testid="revoke-pending-pub-button"
                    onClick={() => {
                      setRevokeTarget(pendingPublication);
                      setIsRevokeModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-coral/30 bg-coral/10 hover:bg-coral/20 text-coral text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    {t('Hủy / Thu hồi')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray">
              {t('Không có tác vụ chỉ mục nào đang chờ xử lý.')}
            </p>
          )}
        </div>
      </div>

      {/* Current Revision Context Notice */}
      {currentRevision && (
        <div className="pt-2 text-xs flex items-center justify-between text-gray border-t border-border/70 font-mono">
          <span>
            {t('Phiên bản đang xem')}: Rev #{currentRevision.revisionNumber} (v{currentRevision.version})
          </span>
          <div>
            {isCurrentRevActive && (
              <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  check
                </span>
                {t('Đây là phiên bản đang hoạt động trong RAG')}
              </span>
            )}
            {isCurrentRevPending && (
              <span className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  hourglass_top
                </span>
                {t('Đây là phiên bản đang chờ hoàn tất chỉ mục')}
              </span>
            )}
            {!isCurrentRevActive && !isCurrentRevPending && currentRevision.status === 'APPROVED' && (
              <span className="text-text">
                {t('Phiên bản đã duyệt, sẵn sàng xuất bản')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isPublishModalOpen && currentRevision && (
        <PublishRevisionModal
          sourceId={source.id}
          sourceTitle={source.latestRevision?.title || currentRevision?.metadata?.title || source.id}
          sourceLatestRevisionId={source.latestRevisionId}
          revision={currentRevision}
          head={virtualHead}
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          onSuccess={handlePublishSuccess}
          onReloadHead={loadHeadAndDetails}
          indeterminateLock={indeterminateLock}
          preservedRequestId={indeterminateOp?.operation === 'PUBLISH' ? indeterminateOp.requestId : undefined}
          preservedReason={indeterminateOp?.operation === 'PUBLISH' ? indeterminateOp.reason : undefined}
          onIndeterminateError={(op) => {
            if (op) {
              setIndeterminateOp(op);
              setIndeterminateLock(true);
            }
          }}
          onVerifyReceipt={handleVerifyReceipt}
        />
      )}

      {isRevokeModalOpen && revokeTarget && (
        <RevokePublicationModal
          publication={revokeTarget}
          head={virtualHead}
          isOpen={isRevokeModalOpen}
          onClose={() => {
            setIsRevokeModalOpen(false);
            setRevokeTarget(null);
          }}
          onSuccess={handleRevokeSuccess}
          onReloadHead={loadHeadAndDetails}
          indeterminateLock={indeterminateLock}
          preservedRequestId={indeterminateOp?.operation === 'REVOKE' ? indeterminateOp.requestId : undefined}
          preservedReason={indeterminateOp?.operation === 'REVOKE' ? indeterminateOp.reason : undefined}
          onIndeterminateError={(op) => {
            if (op) {
              setIndeterminateOp(op);
              setIndeterminateLock(true);
            }
          }}
          onVerifyReceipt={handleVerifyReceipt}
        />
      )}

      {isRetryModalOpen && retryTarget && (
        <RetryPublicationModal
          targetId={retryTarget.targetId}
          kind={retryTarget.kind}
          head={virtualHead}
          title={retryTarget.title}
          isOpen={isRetryModalOpen}
          onClose={() => {
            setIsRetryModalOpen(false);
            setRetryTarget(null);
          }}
          onSuccess={handleRetrySuccess}
          onReloadHead={loadHeadAndDetails}
          indeterminateLock={indeterminateLock}
          preservedRequestId={indeterminateOp && indeterminateOp.targetId === retryTarget.targetId ? indeterminateOp.requestId : undefined}
          preservedReason={indeterminateOp && indeterminateOp.targetId === retryTarget.targetId ? indeterminateOp.reason : undefined}
          onIndeterminateError={(op) => {
            if (op) {
              setIndeterminateOp(op);
              setIndeterminateLock(true);
            }
          }}
          onVerifyReceipt={handleVerifyReceipt}
        />
      )}

      {inspectPublicationId && (
        <PublicationDetailModal
          publicationId={inspectPublicationId}
          isOpen={Boolean(inspectPublicationId)}
          onClose={() => setInspectPublicationId(null)}
          onRequestRevoke={(pub) => {
            setInspectPublicationId(null);
            setRevokeTarget(pub);
            setIsRevokeModalOpen(true);
          }}
          onRequestRetry={(targetId, kind, _head, title) => {
            setInspectPublicationId(null);
            setRetryTarget({ targetId, kind, title });
            setIsRetryModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
