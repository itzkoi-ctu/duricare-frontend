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
  canCreateNextRevision?: boolean;
  onCreateNextRevision?: () => void;
  onViewProvenance?: () => void;
}

export default function PublicationHeadCard({
  source,
  currentRevision,
  isAdmin,
  onPublicationChanged,
  canCreateNextRevision = false,
  onCreateNextRevision,
  onViewProvenance,
}: PublicationHeadCardProps) {
  useLanguage();

  const [head, setHead] = useState<PublicationHead | null>(null);
  const [activePublication, setActivePublication] = useState<PublicationSummary | null>(null);
  const [pendingPublication, setPendingPublication] = useState<PublicationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDetailError, setActiveDetailError] = useState<string | null>(null);
  const [pendingDetailError, setPendingDetailError] = useState<string | null>(null);

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
      let isConfirmed = false;
      if (
        receipt &&
        receipt.response &&
        receipt.requestId === indeterminateOp.requestId &&
        receipt.operation === indeterminateOp.operation
      ) {
        if (indeterminateOp.operation === 'REVOKE') {
          if (receipt.response.publication?.id === indeterminateOp.targetId) {
            isConfirmed = true;
          }
        } else if (indeterminateOp.operation === 'RETRY_INDEX' || indeterminateOp.operation === 'RETRY_CLEANUP') {
          if (
            receipt.response.job?.id === indeterminateOp.targetId ||
            receipt.response.publication?.id === indeterminateOp.targetId
          ) {
            isConfirmed = true;
          }
        } else {
          isConfirmed = true;
        }
      }

      if (isConfirmed && receipt && receipt.response) {
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
        let isConfirmed = false;
        let freshHead: PublicationHead | null = null;

        if (indeterminateOp.operation === 'REVOKE') {
          const [detailRes, headRes] = await Promise.all([
            getPublicationDetail(indeterminateOp.targetId),
            getPublicationHead(source.id),
          ]);
          if (!isMountedRef.current) return;
          freshHead = headRes;

          // Strict confirmation criteria:
          // 1. Target publication status is strictly REVOKED
          // 2. Target is not in activePublicationId
          // 3. Target is not in pendingPublicationId
          if (
            detailRes.publication.id === indeterminateOp.targetId &&
            detailRes.publication.status === 'REVOKED' &&
            freshHead.activePublicationId !== indeterminateOp.targetId &&
            freshHead.pendingPublicationId !== indeterminateOp.targetId
          ) {
            isConfirmed = true;
          } else {
            isConfirmed = false;
          }
        } else if (
          indeterminateOp.operation === 'PUBLISH' ||
          indeterminateOp.operation === 'RETRY_INDEX' ||
          indeterminateOp.operation === 'RETRY_CLEANUP'
        ) {
          freshHead = await getPublicationHead(source.id);
          if (!isMountedRef.current) return;
          if (freshHead.version > indeterminateOp.version) {
            isConfirmed = true;
          }
        }

        if (isConfirmed && freshHead) {
          setIndeterminateOp(null);
          setIndeterminateLock(false);
          setHead(freshHead);
          setIsRevokeModalOpen(false);
          setIsRetryModalOpen(false);
          setIsPublishModalOpen(false);
          return freshHead;
        } else {
          // Receipt 404 and unconfirmed: retain lock
          if (freshHead) {
            setHead(freshHead);
            return freshHead;
          }
        }
      } else {
        throw err;
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
      setError(null);
      setActiveDetailError(null);
      setPendingDetailError(null);
      const headRes = await getPublicationHead(source.id, controller.signal);
      if (!isMountedRef.current || sessionRef.current !== session) return;

      setHead(headRes);
      if (!indeterminateOp) {
        setIndeterminateLock(false);
      }

      // Fetch active & pending publication summaries if IDs are present
      let activePub: PublicationSummary | null = null;
      let pendingPub: PublicationSummary | null = null;
      let actErr: string | null = null;
      let pendErr: string | null = null;

      if (headRes.activePublicationId) {
        try {
          const detailRes = await getPublicationDetail(headRes.activePublicationId, controller.signal);
          if (isMountedRef.current && sessionRef.current === session) {
            activePub = detailRes.publication;
          }
        } catch (err: unknown) {
          if (!controller.signal.aborted) {
            const parsed = parsePublicationError(err, t('Không thể tải chi tiết ấn bản RAG đang hoạt động.'));
            actErr = parsed.message;
          }
        }
      }

      if (headRes.pendingPublicationId) {
        try {
          const detailRes = await getPublicationDetail(headRes.pendingPublicationId, controller.signal);
          if (isMountedRef.current && sessionRef.current === session) {
            pendingPub = detailRes.publication;
          }
        } catch (err: unknown) {
          if (!controller.signal.aborted) {
            const parsed = parsePublicationError(err, t('Không thể tải chi tiết ấn bản RAG đang xử lý.'));
            pendErr = parsed.message;
          }
        }
      }

      if (isMountedRef.current && sessionRef.current === session) {
        setActivePublication(activePub);
        setPendingPublication(pendingPub);
        setActiveDetailError(actErr);
        setPendingDetailError(pendErr);
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

  const hasDetailError = Boolean(activeDetailError || pendingDetailError);
  const hasActiveDetailError = Boolean(head?.activePublicationId && !activePublication && activeDetailError);
  const hasPendingDetailError = Boolean(head?.pendingPublicationId && !pendingPublication && pendingDetailError);

  const canAdminPublishCurrent =
    !loading &&
    !error &&
    !hasDetailError &&
    !hasActiveDetailError &&
    !hasPendingDetailError &&
    head !== null &&
    isAdmin &&
    isCurrentRevApproved &&
    !isCurrentRevActive &&
    !head?.pendingPublicationId &&
    (!head?.activePublicationId || (activePublication && activePublication.revisionId !== currentRevision?.id)) &&
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
      className="p-4 md:p-5 rounded-xl border border-border bg-surface shadow-xs space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px]">
            model_training
          </span>
          <h3 className="text-sm font-semibold text-text">
            {t('Xuất bản vào RAG')}
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-navy/10 text-navy dark:bg-blue/20 dark:text-blue">
            ADMIN
          </span>
        </div>

        <button
          type="button"
          onClick={() => { loadHeadAndDetails().catch(() => {}); }}
          title={t('Tải lại trạng thái xuất bản')}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface text-gray hover:text-text hover:bg-surface-hover cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
        >
          <span aria-hidden="true" className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      {/* RAG Status Row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray">{t('Trạng thái hiện tại:')}</span>
        {loading ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-hover text-gray border border-border">
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{t('Đang tải trạng thái RAG...')}</span>
          </span>
        ) : error || hasActiveDetailError || hasPendingDetailError ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-coral/10 text-coral border border-coral/30">
            <span className="w-1.5 h-1.5 rounded-full bg-coral" />
            <span>{t('Chưa sẵn sàng')}</span>
          </span>
        ) : isCurrentRevActive ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t('RAG · Đang hoạt động')}</span>
          </span>
        ) : activePublication && !isCurrentRevActive ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>{t('RAG · Bản {0} đang hoạt động', [activePublication.revisionNumber])}</span>
          </span>
        ) : isCurrentRevPending ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{t('RAG · Đang xử lý')}</span>
          </span>
        ) : pendingPublication && !isCurrentRevPending ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{t('RAG · Bản {0} đang xử lý', [pendingPublication.revisionNumber])}</span>
          </span>
        ) : !head?.activePublicationId && !head?.pendingPublicationId ? (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{t('RAG · Chưa xuất bản')}</span>
          </span>
        ) : (
          <span data-testid="rag-status-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{t('Chưa sẵn sàng')}</span>
          </span>
        )}
      </div>

      {/* Active publication state indicator / current revision context */}
      <div className="text-xs flex items-center justify-between text-gray border-t border-border/60 pt-2 font-mono">
        <span>
          {t('Bản đang hoạt động:')} {activePublication ? `Bản ${activePublication.revisionNumber}` : t('Chưa có')}
        </span>
        {!isCurrentRevActive && !isCurrentRevPending && currentRevision?.status === 'APPROVED' && (
          <span className="text-text font-sans text-xs">
            {t('Phiên bản đã duyệt, sẵn sàng xuất bản')}
          </span>
        )}
      </div>

      {/* Error banner if present */}
      {(error || activeDetailError || pendingDetailError) && (
        <div className="p-3 rounded-xl border border-coral/30 bg-coral/10 text-coral text-xs flex items-center justify-between gap-2">
          <span>{error || activeDetailError || pendingDetailError}</span>
          <button
            type="button"
            data-testid="retry-publication-detail-button"
            onClick={() => { loadHeadAndDetails().catch(() => {}); }}
            className="font-semibold underline shrink-0 cursor-pointer"
          >
            {t('Thử lại')}
          </button>
        </div>
      )}

      {/* Indeterminate lock alert */}
      {indeterminateLock && (
        <div data-testid="card-indeterminate-alert" className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <p>{t('Thao tác trước đó gặp sự cố mạng hoặc thời gian chờ (timeout). Cần xác minh biên nhận với máy chủ trước khi mở khóa.')}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="verify-receipt-button"
              onClick={() => { handleVerifyReceipt().catch(() => {}); }}
              className="px-2.5 py-1 rounded-lg bg-teal text-white font-semibold cursor-pointer shrink-0 text-xs"
            >
              {t('Xác minh biên nhận')}
            </button>
            <button
              type="button"
              onClick={() => { loadHeadAndDetails().catch(() => {}); }}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer shrink-0 text-xs"
            >
              {t('Tải lại head')}
            </button>
          </div>
        </div>
      )}

      {/* Description text */}
      <p className="text-xs text-gray leading-relaxed">
        {error
          ? t('Không thể tải dữ liệu RAG lúc này. Vui lòng bấm thử lại hoặc kiểm tra kết nối.')
          : isCurrentRevActive
          ? t('Phiên bản đang xem (Bản {0}) đang hoạt động trong cơ sở dữ liệu vector RAG.', [currentRevision?.revisionNumber ?? ''])
          : activePublication && !isCurrentRevActive
          ? t('Lưu ý: Bản {0} đang hoạt động trong RAG. Xuất bản phiên bản này (Bản {1}) sẽ thay thế bản hiện tại.', [activePublication.revisionNumber, currentRevision?.revisionNumber ?? ''])
          : isCurrentRevPending
          ? t('Yêu cầu xuất bản cho bản này đang trong hàng đợi xử lý vector hóa.')
          : canAdminPublishCurrent
          ? t('Xuất bản bản đã duyệt để đưa tri thức vào hệ thống truy vấn và trợ lý AI.')
          : t('Kiểm soát phiên bản tri thức cho trợ lý AI và cơ sở dữ liệu vector.')}
      </p>

      {/* Action Buttons (Strictly 44px min height) */}
      <div className="space-y-2 pt-0.5">
        {canAdminPublishCurrent && currentRevision && (
          <button
            type="button"
            data-testid="open-publish-modal-button"
            onClick={() => setIsPublishModalOpen(true)}
            disabled={indeterminateLock}
            className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-navy hover:bg-navy/90 active:bg-navy/80 text-surface dark:text-bg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              publish
            </span>
            <span>{t('Xuất bản bản này')}</span>
          </button>
        )}

        {/* Desktop Outline Action: Tạo phiên bản mới (immediately below publish button, 8px gap) */}
        {canCreateNextRevision && onCreateNextRevision && (
          <button
            type="button"
            data-testid="create-subsequent-revision-button"
            onClick={onCreateNextRevision}
            className="hidden md:flex w-full h-11 min-h-[44px] px-4 rounded-xl border border-secondary text-secondary hover:bg-surface-hover text-sm font-semibold items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              add_circle
            </span>
            <span>{t('Tạo phiên bản mới')}</span>
          </button>
        )}

        {/* Mobile Secondary Action Row: [Tạo phiên bản mới] [Nguồn gốc] (equal 44px tap targets) */}
        {(canCreateNextRevision || onViewProvenance) && (
          <div className="flex md:hidden items-center gap-2">
            {canCreateNextRevision && onCreateNextRevision && (
              <button
                type="button"
                data-testid="mobile-create-subsequent-revision-button"
                onClick={onCreateNextRevision}
                className="flex-1 h-11 min-h-[44px] border border-border rounded-xl font-medium text-text hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  add_circle
                </span>
                <span>{t('Tạo phiên bản mới')}</span>
              </button>
            )}
            {onViewProvenance && (
              <button
                type="button"
                data-testid="mobile-view-provenance-button"
                onClick={onViewProvenance}
                className="flex-1 h-11 min-h-[44px] border border-border rounded-xl font-medium text-text hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">
                  account_tree
                </span>
                <span>{t('Nguồn gốc')}</span>
              </button>
            )}
          </div>
        )}

        {/* Active Publication Secondary Actions */}
        {activePublication && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="inspect-active-pub-button"
              onClick={() => setInspectPublicationId(activePublication.id)}
              className="flex-1 h-11 min-h-[44px] px-3 rounded-xl border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
              <span>{t('Xem chi tiết')}</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                data-testid="revoke-active-pub-button"
                onClick={() => {
                  setRevokeTarget(activePublication);
                  setIsRevokeModalOpen(true);
                }}
                className="h-11 min-h-[44px] px-4 rounded-xl border border-coral/30 bg-coral/10 hover:bg-coral/20 text-coral text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">block</span>
                <span>{t('Thu hồi')}</span>
              </button>
            )}
          </div>
        )}

        {/* Pending Publication Secondary Actions */}
        {pendingPublication && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">{t('Bản chờ xử lý (Pending)')}</span>
                <PublicationStatusBadge status={pendingPublication.status} />
              </div>
              <div className="text-gray font-mono text-[11px]">
                Rev #{pendingPublication.revisionNumber} (Gen #{pendingPublication.generation}) · ID: {pendingPublication.id}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="inspect-pending-pub-button"
                onClick={() => setInspectPublicationId(pendingPublication.id)}
                className="flex-1 h-11 min-h-[44px] px-3 rounded-xl border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">hourglass_top</span>
                <span>{t('Kiểm tra tiến độ')}</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  data-testid="revoke-pending-pub-button"
                  onClick={() => {
                    setRevokeTarget(pendingPublication);
                    setIsRevokeModalOpen(true);
                  }}
                  className="h-11 min-h-[44px] px-4 rounded-xl border border-coral/30 bg-coral/10 hover:bg-coral/20 text-coral text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">cancel</span>
                  <span>{t('Hủy')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation hint */}
      <div className="flex items-start gap-1.5 text-[11px] text-gray pt-1 border-t border-border/60">
        <span aria-hidden="true" className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">
          info
        </span>
        <span>{t('Xác nhận phạm vi dữ liệu trước khi tạo yêu cầu xuất bản.')}</span>
      </div>

      {/* Detailed Publication Metadata Disclosure */}
      {(activePublication || pendingPublication) && (
        <details className="group border border-border rounded-lg p-2.5 bg-surface-hover/30 text-xs">
          <summary className="cursor-pointer text-gray hover:text-text font-medium flex items-center justify-between select-none">
            <span>{t('Chi tiết hồ sơ xuất bản')}</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] group-open:rotate-180 transition-transform">
              expand_more
            </span>
          </summary>
          <div className="pt-2 space-y-2 text-[11px] font-mono text-gray">
            {activePublication && (
              <div className="p-2 rounded bg-surface border border-border">
                <div className="font-semibold text-text">Active: Rev #{activePublication.revisionNumber} (Gen #{activePublication.generation})</div>
                <div className="truncate">ID: {activePublication.id}</div>
              </div>
            )}
            {pendingPublication && (
              <div className="p-2 rounded bg-surface border border-border">
                <div className="font-semibold text-text">Pending: Rev #{pendingPublication.revisionNumber} (Gen #{pendingPublication.generation})</div>
                <div className="truncate">ID: {pendingPublication.id}</div>
              </div>
            )}
          </div>
        </details>
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
