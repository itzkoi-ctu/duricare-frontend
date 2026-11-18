import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { getReviewDetail, parseGovernanceError } from '../api/governance';
import type {
  AssignmentDetail,
  DecisionRequest,
  DecisionResponse,
  DecisionOutcome,
  Tier,
} from '../types/governance';
import AssignmentStatusBadge from '../components/knowledge/AssignmentStatusBadge';
import DecisionOutcomeBadge from '../components/knowledge/DecisionOutcomeBadge';
import KnowledgeTierBadge from '../components/knowledge/KnowledgeTierBadge';
import ExpertDecisionConfirmModal from '../components/knowledge/ExpertDecisionConfirmModal';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { SOURCE_TYPE_CONFIG, TOPIC_CONFIG, GROWTH_STAGE_CONFIG } from '../utils/governanceStatus';

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

export default function ExpertReviewWorkspacePage() {
  useLanguage();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Review Form State
  const [chunkComments, setChunkComments] = useState<Record<string, string>>({});
  const [noConflictConfirmed, setNoConflictConfirmed] = useState(false);
  const [checkedSource, setCheckedSource] = useState(false);
  const [checkedFaithfulness, setCheckedFaithfulness] = useState(false);
  const [checkedApplicability, setCheckedApplicability] = useState(false);

  const [outcome, setOutcome] = useState<DecisionOutcome>('APPROVED');
  const [assessedTier, setAssessedTier] = useState<Tier>('B');
  const [tierRationale, setTierRationale] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [mustVerifyReload, setMustVerifyReload] = useState(false);
  const [isVerifyingReload, setIsVerifyingReload] = useState(false);
  const [verifyReloadError, setVerifyReloadError] = useState<string | null>(null);
  const [openChunkIds, setOpenChunkIds] = useState<Set<string>>(() => new Set());

  const toggleChunk = (chunkId: string) => {
    setOpenChunkIds(prev => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  const isMountedRef = useRef<boolean>(true);
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeReadbackRequestRef = useRef<AbortController | null>(null);
  const loadedAssignmentIdRef = useRef<string | null>(null);
  const currentRouteAssignmentIdRef = useRef<string | undefined>(assignmentId);
  const readbackSeqRef = useRef<number>(0);

  useEffect(() => {
    currentRouteAssignmentIdRef.current = assignmentId;
  }, [assignmentId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeRequestRef.current?.abort();
      activeReadbackRequestRef.current?.abort();
    };
  }, []);

  const resetDecisionForm = useCallback((proposedTier?: Tier | null) => {
    setChunkComments({});
    setNoConflictConfirmed(false);
    setCheckedSource(false);
    setCheckedFaithfulness(false);
    setCheckedApplicability(false);
    setOutcome('APPROVED');
    setAssessedTier(proposedTier && proposedTier !== 'UNKNOWN' ? proposedTier : 'B');
    setTierRationale('');
    setReason('');
    setIsConfirmModalOpen(false);
    setMustVerifyReload(false);
    setVerifyReloadError(null);
  }, []);

  // When assignmentId route parameter changes, abort lingering readbacks and clear form state to avoid cross-task leakage
  useEffect(() => {
    activeReadbackRequestRef.current?.abort();
    resetDecisionForm();
  }, [assignmentId, resetDecisionForm]);

  // Dedicated verification readback fenced against route/task identity changes (R1)
  const handleVerificationReadback = useCallback(async (): Promise<AssignmentDetail> => {
    if (!assignmentId) {
      throw new Error('No assignmentId available');
    }

    const targetAssignmentId = assignmentId;
    readbackSeqRef.current += 1;
    const currentSeq = readbackSeqRef.current;

    if (activeReadbackRequestRef.current) {
      activeReadbackRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeReadbackRequestRef.current = controller;

    const isStale = () => {
      return (
        !isMountedRef.current ||
        controller.signal.aborted ||
        currentSeq !== readbackSeqRef.current ||
        currentRouteAssignmentIdRef.current !== targetAssignmentId ||
        loadedAssignmentIdRef.current !== targetAssignmentId
      );
    };

    setIsVerifyingReload(true);
    setVerifyReloadError(null);

    try {
      const data = await getReviewDetail(targetAssignmentId, controller.signal);

      // If route or assignment identity changed while in flight, completely discard result
      if (isStale()) {
        return data;
      }

      // Reject/ignore unexpected foreign assignment without resetting current form or retargeting workspace
      if (data.id !== targetAssignmentId) {
        throw new Error('Received mismatched assignment data from server');
      }

      setAssignment(data);
      if (data.status === 'ACTIVE') {
        setMustVerifyReload(false);
      } else if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        setMustVerifyReload(false);
        setIsConfirmModalOpen(false);
      }

      return data;
    } catch (err: unknown) {
      if (isStale()) {
        return undefined as unknown as AssignmentDetail;
      }
      const parsed = parseGovernanceError(err, t('Không thể tải lại dữ liệu từ máy chủ.'));
      setVerifyReloadError(parsed.message);
      throw err;
    } finally {
      if (!isStale()) {
        setIsVerifyingReload(false);
      }
    }
  }, [assignmentId]);

  const loadData = useCallback(async (preserveDraftState = false) => {
    if (!assignmentId) return;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    if (activeReadbackRequestRef.current) {
      activeReadbackRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const data = await getReviewDetail(assignmentId, controller.signal);
      if (!controller.signal.aborted) {
        setAssignment(data);
        const isDifferentAssignment = loadedAssignmentIdRef.current !== data.id;
        loadedAssignmentIdRef.current = data.id;

        if (data.revision?.chunks?.length > 0) {
          setOpenChunkIds(prev => {
            if (prev.size === 0 || isDifferentAssignment) {
              return new Set([data.revision.chunks[0].chunkId]);
            }
            return prev;
          });
        }

        if (isDifferentAssignment || !preserveDraftState) {
          resetDecisionForm(data.revision?.metadata?.proposedTier);
        }
        setMustVerifyReload(false);
        setLoading(false);
        return data;
      }
      return undefined;
    } catch (err) {
      if (!controller.signal.aborted) {
        const parsed = parseGovernanceError(err, t('Không thể tải chi tiết nhiệm vụ thẩm định.'));
        if (parsed.status === 404) {
          setNotFound(true);
        } else {
          setError(parsed.message);
        }
        setLoading(false);
      }
    }
  }, [assignmentId, resetDecisionForm]);

  useEffect(() => {
    loadData();
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, [loadData]);

  if (loading) return <LoadingState />;
  if (notFound) {
    return (
      <div className="py-16 text-center rounded-2xl border border-border bg-surface p-6 shadow-2xs space-y-4">
        <span aria-hidden="true" className="material-symbols-outlined text-gray text-4xl">
          search_off
        </span>
        <h2 className="text-lg font-bold text-text">{t('Không tìm thấy nhiệm vụ thẩm định')}</h2>
        <p className="text-xs text-gray max-w-md mx-auto">
          {t('Nhiệm vụ không tồn tại, đã bị thay thế hoặc bạn không có quyền truy cập.')}
        </p>
        <Link
          to={user?.role === 'ADMIN' ? '/settings/knowledge' : '/knowledge/reviews'}
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
  if (error || !assignment) {
    return <ErrorState message={error || t('Không thể tải nhiệm vụ thẩm định.')} onRetry={loadData} />;
  }

  const { revision, decision } = assignment;
  const meta = revision.metadata;
  const isAssignedExpert = user?.role === 'EXPERT';
  const isActive = assignment.status === 'ACTIVE';
  const isCompleted = assignment.status === 'COMPLETED';
  const isCancelledOrReplaced = assignment.status === 'CANCELLED' || assignment.status === 'REPLACED';

  const handleChunkCommentChange = (chunkId: string, text: string) => {
    setChunkComments(prev => ({
      ...prev,
      [chunkId]: text,
    }));
  };

  // Validation for submitting decision
  const trimmedReason = reason.trim();
  const trimmedTierRationale = tierRationale.trim();

  let isDecisionFormValid = false;
  const formValidationErrors: string[] = [];

  if (isActive && isAssignedExpert) {
    if (!noConflictConfirmed) {
      formValidationErrors.push(t('Bạn phải cam đoan không có xung đột lợi ích để gửi quyết định.'));
    }

    if (trimmedReason.length < 3 || trimmedReason.length > 4000) {
      formValidationErrors.push(t('Lý do / nhận xét chuyên môn phải từ 3 đến 4000 ký tự.'));
    }

    if (outcome === 'APPROVED') {
      if (!checkedSource) {
        formValidationErrors.push(t('Phê duyệt yêu cầu xác nhận đã đối chiếu tài liệu nguồn.'));
      }
      if (!checkedFaithfulness) {
        formValidationErrors.push(t('Phê duyệt yêu cầu xác nhận tính trung thực của các trích đoạn.'));
      }
      if (!checkedApplicability) {
        formValidationErrors.push(t('Phê duyệt yêu cầu xác nhận tính khả thi và điều kiện áp dụng thực tế.'));
      }
      if (assessedTier === 'UNKNOWN') {
        formValidationErrors.push(t('Phê duyệt bắt buộc phải xác nhận tầng tri thức cụ thể (Tầng A–E), không được để Chưa phân tầng.'));
      }
      if (trimmedTierRationale.length < 3 || trimmedTierRationale.length > 4000) {
        formValidationErrors.push(t('Căn cứ xếp tầng tri thức là bắt buộc khi phê duyệt (3 đến 4000 ký tự).'));
      }
    } else {
      // CHANGES_REQUESTED or REJECTED
      if (assessedTier !== 'UNKNOWN' && (trimmedTierRationale.length < 3 || trimmedTierRationale.length > 4000)) {
        formValidationErrors.push(t('Khi chọn tầng A–E, căn cứ xếp tầng phải từ 3 đến 4000 ký tự.'));
      }
    }

    isDecisionFormValid = formValidationErrors.length === 0;
  }

  const prepareDecisionPayload = (): DecisionRequest => {
    const formattedChunkComments = Object.entries(chunkComments)
      .filter(([, c]) => c.trim().length > 0)
      .map(([chunkId, c]) => ({
        chunkId,
        comment: c.trim(),
      }));

    return {
      version: revision.version,
      assignmentVersion: assignment.version,
      outcome,
      reason: trimmedReason,
      assessedTier,
      tierRationale: assessedTier !== 'UNKNOWN' ? trimmedTierRationale : null,
      conflictOfInterestDeclared: false,
      checkedSource,
      checkedFaithfulness,
      checkedApplicability,
      chunkComments: formattedChunkComments,
    };
  };

  const handleDecisionSuccess = (res: DecisionResponse) => {
    setAssignment({
      ...assignment,
      status: 'COMPLETED',
      decision: res.decision,
      revision: res.revision,
    });
    setIsConfirmModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-3">
        <div>
          <Link
            to={user?.role === 'ADMIN' ? '/settings/knowledge' : '/knowledge/reviews'}
            data-testid="back-to-queue-link"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0072a8] dark:text-[#38bdf8] hover:underline transition-all"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span>
              {user?.role === 'ADMIN' ? t('Quay lại hàng đợi điều phối') : t('Quay lại Nhiệm vụ thẩm định')}
            </span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-1">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[24px] leading-8 font-bold text-text tracking-tight [overflow-wrap:anywhere]">
                {meta.title}
              </h1>
              <AssignmentStatusBadge status={assignment.status} size="sm" />
              {assignment.status === 'COMPLETED' && decision?.assessedTier && (
                <KnowledgeTierBadge tier={decision.assessedTier} />
              )}
            </div>
            <p className="text-sm text-gray mt-1 [overflow-wrap:anywhere]">
              {meta.provenanceNotes || t('Quy trình canh tác chuẩn hóa theo Tiêu chuẩn Nông nghiệp Tốt (VietGAP) áp dụng cho sầu riêng ĐBSCL')}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadData(false)}
              title={t('Tải lại dữ liệu')}
              className="h-11 px-4 border border-border bg-surface hover:bg-bg rounded-lg text-text text-sm font-medium flex items-center gap-2 shrink-0 transition-colors shadow-sm cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray">
                refresh
              </span>
              <span>{t('Làm mới')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role / Status Banners */}
      {user?.role === 'ADMIN' && (
        <div
          data-testid="admin-readonly-banner"
          className="p-3.5 rounded-xl border border-blue/30 bg-blue/10 text-blue flex items-center gap-2 text-xs font-medium"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg shrink-0">
            visibility
          </span>
          <span>
            {t('Bạn đang xem snapshot hồ sơ này dưới quyền Quản trị viên (Chế độ chỉ đọc). Chỉ chuyên gia được phân công mới có thể gửi quyết định chuyên môn.')}
          </span>
        </div>
      )}

      {isCancelledOrReplaced && (
        <div
          data-testid="assignment-inactive-banner"
          className="p-4 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-1 text-xs"
        >
          <div className="flex items-center gap-2 font-bold">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              cancel
            </span>
            <span>{t('Nhiệm vụ phân công này không còn hiệu lực')}</span>
          </div>
          <p className="leading-relaxed">
            {assignment.status === 'REPLACED'
              ? t('Nhiệm vụ thẩm định đã được điều phối chuyển giao cho chuyên gia khác.')
              : t('Nhiệm vụ đã bị hủy do tác giả rút hồ sơ khỏi hàng đợi thẩm định.')}
          </p>
        </div>
      )}

      {/* Compact Assignment Strip with Technical IDs & Source Metadata Disclosures (Default CLOSED) */}
      <div className="bg-surface border border-border rounded-xl p-4 mt-3 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="material-symbols-outlined text-[#1f5ca9] dark:text-[#60a5fa] text-[20px] mt-0.5 shrink-0">
            assignment_ind
          </span>
          <div className="flex-1 text-sm text-text leading-relaxed">
            <span className="font-semibold text-text">{t('Phân công thẩm định')}: </span>
            <span>
              {t('Được giao ngày')} <strong className="font-medium text-text">{formatDate(assignment.assignedAt)}</strong>
              {assignment.assignedBy ? (
                <> {t('bởi')} <strong className="font-medium text-text">{t('Quản trị viên #{0}', [assignment.assignedBy])}</strong></>
              ) : null}.{' '}
              <span className="text-gray">{t('Chuyên gia phụ trách')}: </span>
              <strong className="font-medium text-[#1f5ca9] dark:text-[#60a5fa]">{assignment.reviewerDisplayName}</strong>.
            </span>
            <div className="text-gray mt-0.5">
              <span className="font-medium text-text">{t('Yêu cầu')}: </span>
              {assignment.assignmentReason}
            </div>
          </div>
        </div>

        {/* Collapsible 1: Technical IDs (CLOSED by default) */}
        <div className="pt-2 border-t border-border/70">
          <details className="group cursor-pointer">
            <summary className="flex items-center justify-between text-[12px] font-medium text-gray hover:text-text select-none list-none py-1">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray/80">
                  fingerprint
                </span>
                <span>{t('Thông số kỹ thuật & ID')}</span>
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray/80 transition-transform duration-200 group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="mt-2 pt-2 border-t border-border/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] bg-bg/50 p-3 rounded-lg border border-border font-mono">
              <div>
                <span className="text-gray block font-sans">{t('Mã nhiệm vụ (ID)')}:</span>
                <span className="text-text font-medium">{assignment.id}</span>
              </div>
              <div>
                <span className="text-gray block font-sans">{t('Bản nộp nguồn')}:</span>
                <span className="text-text font-medium">{revision.id} (v{revision.version})</span>
              </div>
              <div>
                <span className="text-gray block font-sans">{t('Phiên bản phân công')}:</span>
                <span className="text-text font-medium">v{assignment.version}</span>
              </div>
            </div>
          </details>
        </div>

        {/* Collapsible 2: Source Metadata Accordion (CLOSED by default) */}
        <div className="pt-2 border-t border-border/70">
          <details className="group cursor-pointer">
            <summary className="flex items-center justify-between text-[12px] font-medium text-gray hover:text-text select-none list-none py-1">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray/80">
                  auto_stories
                </span>
                <span>{t('Thông tin tài liệu nguồn & Xuất xứ (Tác giả, Nhà xuất bản, Năm phát hành)')}</span>
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray/80 transition-transform duration-200 group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <div className="mt-2 pt-2 border-t border-border/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] bg-bg/50 p-3 rounded-lg border border-border">
              <div>
                <span className="text-gray block font-medium">{t('Tác giả biên soạn')}:</span>
                <span className="text-text font-semibold [overflow-wrap:anywhere]">{meta.authors || '—'}</span>
              </div>
              <div>
                <span className="text-gray block font-medium">{t('Đơn vị xuất bản')}:</span>
                <span className="text-text font-semibold [overflow-wrap:anywhere]">{meta.publisher || '—'}</span>
              </div>
              <div>
                <span className="text-gray block font-medium">{t('Loại nguồn')}:</span>
                <span className="text-text font-semibold">{t(SOURCE_TYPE_CONFIG[meta.sourceType])}</span>
              </div>
              <div>
                <span className="text-gray block font-medium">{t('Năm công bố')}:</span>
                <span className="text-text font-semibold">{meta.year || '—'} {meta.edition ? `(${meta.edition})` : ''}</span>
              </div>
              {meta.sourceUrl && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className="text-gray block font-medium">{t('Đường dẫn trực tuyến')}:</span>
                  <a href={meta.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#0072a8] dark:text-[#38bdf8] font-medium hover:underline truncate block">
                    {meta.sourceUrl}
                  </a>
                </div>
              )}
              {meta.evidenceReference && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className="text-gray block font-medium">{t('Căn cứ trích dẫn')}:</span>
                  <span className="text-text leading-relaxed [overflow-wrap:anywhere]">{meta.evidenceReference}</span>
                </div>
              )}
              {meta.provenanceNotes && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className="text-gray block font-medium">{t('Ghi chú xuất xứ')}:</span>
                  <span className="text-text leading-relaxed [overflow-wrap:anywhere]">{meta.provenanceNotes}</span>
                </div>
              )}
              {meta.proposedTier && (
                <div className="sm:col-span-2 lg:col-span-4 border-t border-border pt-2 flex items-center gap-2">
                  <span className="text-gray font-medium">{t('Tác giả đề xuất tầng')}:</span>
                  <KnowledgeTierBadge tier={meta.proposedTier} showDesc />
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* TWO COLUMN OPERATIONAL LAYOUT (65% / 35%) */}
      <div className="workspace-layout grid grid-cols-1 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] gap-6 mt-6 items-start">
        {/* LEFT COLUMN: Reading & Chunk Review (65%) */}
        <section className="w-full reading-column flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-text">
                {t('Các đoạn tri thức cần thẩm định ({0} đoạn)', [revision.chunks.length])}
              </h2>
              <p className="text-xs text-gray">
                {t('Đối chiếu nội dung chuẩn hóa với trích đoạn tài liệu gốc')}
              </p>
            </div>
            <span className="text-xs text-gray bg-surface border border-border px-2.5 py-1 rounded-md">
              {t('Đối chiếu từng đoạn')}
            </span>
          </div>

          {revision.chunks.map((c, idx) => {
            const isOpen = openChunkIds.has(c.chunkId);
            if (!isOpen) {
              return (
                <article
                  key={c.chunkId || `chunk-${idx}`}
                  onClick={() => toggleChunk(c.chunkId)}
                  className="h-14 px-6 flex items-center justify-between bg-surface border border-border rounded-xl cursor-pointer hover:bg-bg transition-colors shadow-sm select-none"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-6 h-6 rounded bg-bg text-gray text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-text truncate">
                      {c.title}
                    </span>
                    {c.locator && (
                      <>
                        <span className="text-gray/60 text-xs shrink-0">·</span>
                        <span className="text-xs text-gray shrink-0">{c.locator}</span>
                      </>
                    )}
                    <span className="text-gray/60 text-xs shrink-0">·</span>
                    <span className="text-xs text-gray shrink-0">{t(TOPIC_CONFIG[c.topic])}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#0072a8] dark:text-[#38bdf8] text-xs font-medium shrink-0 ml-4">
                    <span>{t('Mở xem')}</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      expand_more
                    </span>
                  </div>
                </article>
              );
            }

            return (
              <article
                key={c.chunkId || `chunk-${idx}`}
                className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#1f5ca9] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h3 className="text-base font-semibold text-text [overflow-wrap:anywhere]">
                        {c.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center h-6 px-2 rounded-md bg-[#eff4ff] border border-[#d6e3ff] text-[#1f5ca9] dark:bg-[#172c49] dark:text-[#60a5fa] dark:border-[#1e40af] text-[11px] font-medium">
                        {t('Chủ đề')}: {t(TOPIC_CONFIG[c.topic])}
                      </span>
                      <span className="inline-flex items-center h-6 px-2 rounded-md bg-[#eff4ff] border border-[#d6e3ff] text-[#1f5ca9] dark:bg-[#172c49] dark:text-[#60a5fa] dark:border-[#1e40af] text-[11px] font-medium">
                        {t('Giai đoạn')}: {c.stage ? t(GROWTH_STAGE_CONFIG[c.stage]) : t('Áp dụng chung')}
                      </span>
                      {c.locator && (
                        <span className="inline-flex items-center h-6 px-2 rounded-md bg-bg border border-border text-gray text-[11px] font-medium font-mono">
                          {c.locator}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleChunk(c.chunkId)}
                    className="text-xs text-gray hover:text-text font-medium bg-bg border border-border px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    {t('Thu gọn')}
                  </button>
                </div>

                {/* Block A: Standardized Technical Content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[13px] font-semibold text-text flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#1f5ca9] dark:text-[#60a5fa]">
                        psychology
                      </span>
                      <span>{t('Nội dung chuẩn hóa kỹ thuật')}</span>
                    </label>
                    <span className="text-[11px] text-gray">{t('Cấu trúc lưu vào Cơ sở Tri thức')}</span>
                  </div>
                  <div className="bg-bg/60 p-4 rounded-lg border border-border text-sm text-text leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {c.content || '—'}
                  </div>
                </div>

                {/* Block B: Exact Excerpt from Original Source */}
                {c.originalExcerpt && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[13px] font-semibold text-gray flex items-center gap-1.5">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray">
                          article
                        </span>
                        <span>{t('Trích đoạn tài liệu gốc (Exact Excerpt)')}</span>
                      </label>
                      <span className="text-[11px] text-gray">{t('Đoạn gốc')}</span>
                    </div>
                    <div className="bg-surface p-4 rounded-lg border border-border text-xs text-gray font-mono leading-relaxed bg-bg/30 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      "{c.originalExcerpt}"
                    </div>
                  </div>
                )}

                {/* Field Notes (Applicability & Measurement) */}
                {(c.applicabilityNotes || c.measurementNotes) && (
                  <div className="bg-[#f0f7fa] dark:bg-[#112438] border border-[#bae6fd] dark:border-[#1e40af] p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-[#004a68] dark:text-[#93c5fd]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#0072a8] dark:text-[#38bdf8] text-[18px] mt-0.5 shrink-0">
                      info
                    </span>
                    <div className="leading-relaxed space-y-1">
                      {c.applicabilityNotes && (
                        <div>
                          <strong className="font-semibold">{t('Phạm vi áp dụng')}: </strong>
                          <span>{c.applicabilityNotes}</span>
                        </div>
                      )}
                      {c.measurementNotes && (
                        <div>
                          <strong className="font-semibold">{t('Ghi chú đo lường')}: </strong>
                          <span>{c.measurementNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-chunk comment textarea */}
                {isActive && isAssignedExpert && (
                  <div className="pt-2">
                    <label
                      htmlFor={`chunk-comment-input-${c.chunkId}`}
                      className="block text-[13px] font-medium text-text mb-1.5"
                    >
                      {t('Nhận xét đoạn này (Tùy chọn)')}
                    </label>
                    <textarea
                      id={`chunk-comment-input-${c.chunkId}`}
                      data-testid={`chunk-comment-input-${c.chunkId}`}
                      rows={3}
                      value={chunkComments[c.chunkId] || ''}
                      onChange={e => handleChunkCommentChange(c.chunkId, e.target.value)}
                      placeholder={t('Nhập ghi chú hoặc góp ý chi tiết cho đoạn trích này...')}
                      className="w-full min-h-[72px] border border-border rounded-lg p-3 text-[16px] sm:text-sm text-text placeholder:text-gray/60 focus:border-[#0072a8] focus:ring-2 focus:ring-[#00afef]/25 transition-all outline-none bg-surface"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* RIGHT COLUMN: Decision Form / Completed Card (35%) */}
        <aside className="w-full">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm lg:sticky lg:top-24 space-y-5">
            {/* Card Title */}
            <div className="border-b border-border pb-4">
              <h2 className="text-[18px] leading-6 font-bold text-text">
                {t('Quyết định thẩm định')}
              </h2>
              <p className="text-xs text-gray mt-0.5">
                {isCompleted ? t('Kết quả đã được ghi nhận vào nhật ký kiểm toán') : t('Dành cho Chuyên gia phụ trách hồ sơ')}
              </p>
            </div>

            {/* Completed Decision View */}
            {isCompleted && decision && (
              <div data-testid="completed-decision-card" className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-gray">{t('Kết luận thẩm định')}:</span>
                  <DecisionOutcomeBadge outcome={decision.outcome} />
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-gray">{t('Tầng tri thức được xác nhận')}:</span>
                  {decision.assessedTier ? (
                    <KnowledgeTierBadge tier={decision.assessedTier} showDesc />
                  ) : (
                    <span className="text-gray">—</span>
                  )}
                </div>
                <div className="border-b border-border pb-3 space-y-1">
                  <span className="text-gray font-semibold block">{t('Ngày ban hành')}:</span>
                  <span className="font-mono text-text">{formatDate(decision.decidedAt)}</span>
                </div>
                <div className="border-b border-border pb-3 space-y-1">
                  <span className="text-gray font-semibold block">{t('Lý do & Ý kiến thẩm định')}:</span>
                  <p className="text-text leading-relaxed [overflow-wrap:anywhere]">{decision.reason}</p>
                </div>
                {decision.tierRationale && (
                  <div className="border-b border-border pb-3 space-y-1">
                    <span className="text-gray font-semibold block">{t('Căn cứ xếp tầng')}:</span>
                    <p className="text-text leading-relaxed [overflow-wrap:anywhere] italic">"{decision.tierRationale}"</p>
                  </div>
                )}
                {decision.chunkComments && decision.chunkComments.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-gray font-semibold block">
                      {t('Góp ý chi tiết ({0} đoạn)', [decision.chunkComments.length])}:
                    </span>
                    <ul className="space-y-1 text-gray">
                      {decision.chunkComments.map((cm, i) => (
                        <li key={i} className="bg-bg/50 p-2 rounded border border-border [overflow-wrap:anywhere]">
                          <strong className="text-text block mb-0.5">#{cm.chunkId}:</strong>
                          {cm.comment}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Active Expert Form */}
            {isActive && isAssignedExpert && (
              <section data-testid="decision-form-section" aria-label={t('Biểu mẫu quyết định thẩm định')} className="space-y-4">
                {/* 1. Cam kết & Tiêu chuẩn đánh giá */}
                <div className="space-y-3">
                  <div className="text-[12px] font-semibold text-gray uppercase tracking-wide">
                    {t('1. Cam kết & Tiêu chuẩn đánh giá')}
                  </div>
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-bg/50 cursor-pointer hover:bg-bg transition-colors">
                    <input
                      type="checkbox"
                      data-testid="conflict-of-interest-checkbox"
                      checked={noConflictConfirmed}
                      onChange={e => setNoConflictConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-[#1f5ca9] border-gray focus:ring-[#00afef]/30 focus:ring-offset-0"
                    />
                    <span className="text-[13px] font-medium text-text leading-tight">
                      {t('Tôi cam đoan không có xung đột lợi ích và thực hiện thẩm định độc lập, khách quan.')}
                    </span>
                  </label>

                  <div className="space-y-2 pl-1">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checklist-source"
                        checked={checkedSource}
                        onChange={e => setCheckedSource(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded text-[#1f5ca9] border-gray focus:ring-[#00afef]/30 focus:ring-offset-0"
                      />
                      <span className="text-xs text-text leading-tight">
                        <strong className="font-semibold text-text">{t('Đối chiếu tài liệu nguồn')}: </strong>
                        {t('Đã kiểm tra tính xác thực từ bản gốc.')}
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checklist-faithfulness"
                        checked={checkedFaithfulness}
                        onChange={e => setCheckedFaithfulness(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded text-[#1f5ca9] border-gray focus:ring-[#00afef]/30 focus:ring-offset-0"
                      />
                      <span className="text-xs text-text leading-tight">
                        <strong className="font-semibold text-text">{t('Trung thực trích đoạn')}: </strong>
                        {t('Nội dung phản ánh đúng dữ liệu khoa học.')}
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checklist-applicability"
                        checked={checkedApplicability}
                        onChange={e => setCheckedApplicability(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded text-[#1f5ca9] border-gray focus:ring-[#00afef]/30 focus:ring-offset-0"
                      />
                      <span className="text-xs text-text leading-tight">
                        <strong className="font-semibold text-text">{t('Phạm vi áp dụng')}: </strong>
                        {t('Phù hợp với điều kiện sinh thái canh tác sầu riêng.')}
                      </span>
                    </label>
                  </div>
                </div>

                {/* 2. Kết luận thẩm định */}
                <div className="space-y-2.5 pt-2 border-t border-border/70">
                  <div className="text-[12px] font-semibold text-gray uppercase tracking-wide">
                    {t('2. Kết luận thẩm định')} *
                  </div>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      outcome === 'APPROVED'
                        ? 'border-[#bae6fd] bg-[#eff6ff] dark:bg-[#172c49] dark:border-[#1e40af]'
                        : 'border-border bg-surface hover:bg-bg'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_conclusion"
                      data-testid="outcome-radio-APPROVED"
                      checked={outcome === 'APPROVED'}
                      onChange={() => {
                        setOutcome('APPROVED');
                        if (assessedTier === 'UNKNOWN') setAssessedTier('B');
                      }}
                      className="mt-1 h-4 w-4 text-[#1f5ca9] border-gray focus:ring-[#00afef]/30"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-text leading-tight">
                        {t('Phê duyệt hồ sơ')}
                      </span>
                      <span className="text-[11px] text-gray mt-0.5">
                        {t('Quyết định chuyên môn; xuất bản RAG là bước riêng')}
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      outcome === 'CHANGES_REQUESTED'
                        ? 'border-[#fde68a] bg-[#fefce8] dark:bg-[#382b0e] dark:border-[#854d0e]'
                        : 'border-border bg-surface hover:bg-bg'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_conclusion"
                      data-testid="outcome-radio-CHANGES_REQUESTED"
                      checked={outcome === 'CHANGES_REQUESTED'}
                      onChange={() => setOutcome('CHANGES_REQUESTED')}
                      className="mt-1 h-4 w-4 text-[#1f5ca9] border-gray focus:ring-[#00afef]/30"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-text leading-tight">
                        {t('Yêu cầu chỉnh sửa')}
                      </span>
                      <span className="text-[11px] text-gray mt-0.5">
                        {t('Yêu cầu biên tập viên bổ sung/sửa đổi')}
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      outcome === 'REJECTED'
                        ? 'border-[#fecaca] bg-[#fef2f2] dark:bg-[#451a1a] dark:border-[#991b1b]'
                        : 'border-border bg-surface hover:bg-bg'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_conclusion"
                      data-testid="outcome-radio-REJECTED"
                      checked={outcome === 'REJECTED'}
                      onChange={() => setOutcome('REJECTED')}
                      className="mt-1 h-4 w-4 text-[#1f5ca9] border-gray focus:ring-[#00afef]/30"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-coral leading-tight">
                        {t('Từ chối hồ sơ')}
                      </span>
                      <span className="text-[11px] text-gray mt-0.5">
                        {t('Không đạt tiêu chuẩn kỹ thuật hoặc sai lệch')}
                      </span>
                    </div>
                  </label>
                </div>

                {/* 3. Tầng tri thức đánh giá */}
                <div className="pt-2 border-t border-border/70 space-y-1.5">
                  <label className="block text-[13px] font-medium text-text" htmlFor="knowledge-tier-select">
                    {t('3. Tầng tri thức đánh giá *')}
                  </label>
                  <div className="relative">
                    <select
                      id="knowledge-tier-select"
                      data-testid="knowledge-tier-select"
                      value={assessedTier}
                      onChange={e => setAssessedTier(e.target.value as Tier)}
                      className="w-full h-11 border border-border rounded-lg px-3 pr-10 bg-surface text-sm text-text focus:border-[#0072a8] focus:ring-2 focus:ring-[#00afef]/25 transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="A">{t('Tầng A — Văn bản cơ quan chuyên ngành / Nghiên cứu khoa học thẩm định')}</option>
                      <option value="B">{t('Tầng B — Hướng dẫn kỹ thuật viện nghiên cứu / khuyến nông')}</option>
                      <option value="C">{t('Tầng C — Quy trình hợp tác xã / tổ chức sản xuất có hồ sơ')}</option>
                      <option value="D">{t('Tầng D — Tài liệu thương mại / nhà cung cấp có xuất xứ')}</option>
                      <option value="E">{t('Tầng E — Kinh nghiệm / phỏng vấn thực địa có biên bản')}</option>
                      <option value="UNKNOWN" disabled={outcome === 'APPROVED'}>
                        {t('Chưa phân tầng — Chưa đủ bằng chứng xếp hạng')}
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* 4. Căn cứ xếp tầng */}
                {assessedTier !== 'UNKNOWN' && (
                  <div className="pt-2 border-t border-border/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-medium text-text" htmlFor="tier-rationale-input">
                        {t('4. Căn cứ xếp tầng *')}
                      </label>
                      <span className={`text-[11px] font-mono ${trimmedTierRationale.length > 4000 ? 'text-coral font-bold' : 'text-gray'}`}>
                        {trimmedTierRationale.length} / 4.000 ký tự
                      </span>
                    </div>
                    <textarea
                      id="tier-rationale-input"
                      data-testid="tier-rationale-input"
                      rows={2}
                      value={tierRationale}
                      onChange={e => setTierRationale(e.target.value)}
                      placeholder={t('Nêu rõ cơ sở khoa học để xếp hồ sơ vào tầng tri thức đã chọn...')}
                      className="w-full min-h-[64px] border border-border rounded-lg p-2.5 text-[16px] sm:text-sm text-text placeholder:text-gray/60 focus:border-[#0072a8] focus:ring-2 focus:ring-[#00afef]/25 transition-all outline-none bg-surface"
                    />
                  </div>
                )}

                {/* 5. Lý do & Ý kiến thẩm định */}
                <div className="pt-2 border-t border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-text" htmlFor="decision-reason-input">
                      {t('5. Lý do & Ý kiến thẩm định *')}
                    </label>
                    <span className={`text-[11px] font-mono ${trimmedReason.length > 4000 ? 'text-coral font-bold' : 'text-gray'}`}>
                      {trimmedReason.length} / 4.000 ký tự
                    </span>
                  </div>
                  <textarea
                    id="decision-reason-input"
                    data-testid="decision-reason-input"
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={t('Nhập đánh giá tổng thể, căn cứ chuyên môn kỹ thuật hoặc nội dung cần chỉnh sửa...')}
                    className="w-full min-h-[80px] border border-border rounded-lg p-2.5 text-[16px] sm:text-sm text-text placeholder:text-gray/60 focus:border-[#0072a8] focus:ring-2 focus:ring-[#00afef]/25 transition-all outline-none bg-surface"
                  />
                </div>

                {/* Indeterminate Warning */}
                {mustVerifyReload && (
                  <div
                    data-testid="decision-indeterminate-warning"
                    className="p-3.5 rounded-lg border border-amber/40 bg-amber/10 text-amber text-xs space-y-2"
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        warning
                      </span>
                      <span>{t('Kết quả thao tác trước đó chưa xác định')}</span>
                    </div>
                    <p className="text-[11px] text-text/80 leading-relaxed">
                      {t('Đã xảy ra xung đột phiên bản hoặc gián đoạn mạng. Cần tải lại dữ liệu để xác minh trạng thái.')}
                    </p>
                    {verifyReloadError && (
                      <p className="text-[11px] text-coral font-medium">
                        {verifyReloadError}
                      </p>
                    )}
                    <button
                      type="button"
                      data-testid="workspace-verify-reload-button"
                      onClick={() => handleVerificationReadback()}
                      disabled={isVerifyingReload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber text-surface dark:text-bg font-semibold hover:opacity-90 cursor-pointer text-xs"
                    >
                      <span aria-hidden="true" className={`material-symbols-outlined text-sm ${isVerifyingReload ? 'animate-spin' : ''}`}>
                        refresh
                      </span>
                      <span>{isVerifyingReload ? t('Đang tải lại dữ liệu...') : t('Tải lại dữ liệu và đồng bộ phiên bản')}</span>
                    </button>
                  </div>
                )}

                {/* Validation Errors Box */}
                {formValidationErrors.length > 0 && (
                  <div className="p-3 rounded-lg border border-coral/30 bg-coral/10 text-coral space-y-1 text-xs">
                    <span className="font-semibold block">{t('Vui lòng hoàn thiện yêu cầu')}:</span>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {formValidationErrors.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Section 6: Action & Status */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray">{t('Trạng thái thao tác')}:</span>
                    <span className="flex items-center gap-1.5 text-gray font-medium">
                      <span className="w-2 h-2 rounded-full bg-gray/60"></span>
                      <span>{t('Chưa gửi quyết định')}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    data-testid="open-decision-confirm-button"
                    data-preview-cta="true"
                    disabled={!isDecisionFormValid || mustVerifyReload}
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="h-11 w-full bg-[#1f5ca9] hover:bg-[#184988] text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      task_alt
                    </span>
                    <span>{t('Kiểm tra và xác nhận')}</span>
                  </button>
                  <p className="text-[11px] text-gray text-center leading-relaxed">
                    {t('Nhấn nút để mở bước xác nhận cuối cùng trước khi chuyển trạng thái hồ sơ.')}
                  </p>
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && assignment && assignment.id === assignmentId && (
        <ExpertDecisionConfirmModal
          assignment={assignment}
          decisionData={prepareDecisionPayload()}
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onSuccess={handleDecisionSuccess}
          onReload={handleVerificationReadback}
          mustVerifyReload={mustVerifyReload}
          onIndeterminateError={() => setMustVerifyReload(true)}
        />
      )}
    </div>
  );
}
