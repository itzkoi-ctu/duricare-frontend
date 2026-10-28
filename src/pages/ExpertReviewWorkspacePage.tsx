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
import { SOURCE_TYPE_CONFIG, TOPIC_CONFIG, GROWTH_STAGE_CONFIG, TIER_CONFIG } from '../utils/governanceStatus';

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

  const activeRequestRef = useRef<AbortController | null>(null);
  const loadedAssignmentIdRef = useRef<string | null>(null);

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
  }, []);

  // When assignmentId route parameter changes, immediately clear form state to avoid cross-task leakage
  useEffect(() => {
    resetDecisionForm();
  }, [assignmentId, resetDecisionForm]);

  const loadData = useCallback(async (preserveDraftState = false) => {
    if (!assignmentId) return;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link
            to={user?.role === 'ADMIN' ? '/settings/knowledge' : '/knowledge/reviews'}
            data-testid="back-to-queue-link"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray hover:text-text mb-2 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              arrow_back
            </span>
            <span>
              {user?.role === 'ADMIN' ? t('Quay lại hàng đợi điều phối') : t('Quay lại danh sách thẩm định')}
            </span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-text [overflow-wrap:anywhere]">
              {meta.title}
            </h1>
            <AssignmentStatusBadge status={assignment.status} size="sm" />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray font-mono flex-wrap">
            <span>Assignment: {assignment.id.slice(0, 8)}... (v{assignment.version})</span>
            <span>•</span>
            <span>Rev #{revision.revisionNumber} (v{revision.version})</span>
            <span>•</span>
            <span>{t('Giao ngày')}: {formatDate(assignment.assignedAt)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(false)}
          title={t('Tải lại dữ liệu')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs self-start sm:self-auto shrink-0"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            refresh
          </span>
        </button>
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

      {/* Assignment Context Banner */}
      <div className="p-4 rounded-2xl border border-border bg-surface shadow-2xs space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-border/70 pb-2">
          <span className="font-semibold text-text flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-base">
              assignment_ind
            </span>
            <span>{t('Thông tin phân công thẩm định')}</span>
          </span>
          <span className="text-gray">{t('Người thẩm định')}: <strong className="text-text">{assignment.reviewerDisplayName}</strong></span>
        </div>
        <div className="text-gray">
          <span className="font-semibold text-text">{t('Chỉ đạo / Lý do phân công')}:</span> {assignment.assignmentReason}
        </div>
      </div>

      {/* Immutable Revision Metadata */}
      <section
        aria-label={t('Thông tin xuất bản')}
        className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-2xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-lg">
              menu_book
            </span>
            <span>{t('Hồ sơ xuất bản nguồn (Bản snapshot bất biến)')}</span>
          </h2>
          <span className="px-2 py-0.5 rounded bg-gray/10 text-gray text-xs font-mono">
            DURI-1B-v1
          </span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <dt className="text-gray mb-1">{t('Tác giả')}</dt>
            <dd className="font-semibold text-text [overflow-wrap:anywhere]">{meta.authors || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Đơn vị xuất bản')}</dt>
            <dd className="font-semibold text-text [overflow-wrap:anywhere]">{meta.publisher || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Loại nguồn')}</dt>
            <dd className="font-semibold text-text">
              {t(SOURCE_TYPE_CONFIG[meta.sourceType])}
            </dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Năm xuất bản')}</dt>
            <dd className="font-semibold text-text">{meta.year || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Phiên bản ấn phẩm')}</dt>
            <dd className="font-semibold text-text">{meta.edition || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray mb-1">{t('Thời gian nộp')}</dt>
            <dd className="font-semibold text-text font-mono">{formatDate(revision.submittedAt)}</dd>
          </div>

          {meta.sourceUrl && (
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

          {meta.evidenceReference && (
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-gray mb-1">{t('Căn cứ trích dẫn / Lưu trữ hiện vật')}</dt>
              <dd className="text-text font-medium leading-relaxed [overflow-wrap:anywhere]">
                {meta.evidenceReference}
              </dd>
            </div>
          )}

          {meta.provenanceNotes && (
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-gray mb-1">{t('Ghi chú xuất xứ & phương pháp thu thập')}</dt>
              <dd className="text-text font-medium leading-relaxed [overflow-wrap:anywhere] bg-bg/50 p-3 rounded-xl border border-border/80">
                {meta.provenanceNotes}
              </dd>
            </div>
          )}

          {meta.proposedTier && (
            <div className="md:col-span-2 lg:col-span-3 border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <dt className="text-gray">{t('Tác giả đề xuất tầng chất lượng')}:</dt>
                <dd>
                  <KnowledgeTierBadge tier={meta.proposedTier} showDesc />
                </dd>
              </div>
              {meta.proposedTierRationale && (
                <div className="text-xs text-text bg-bg/50 p-3 rounded-xl border border-border/80 mt-2">
                  <p className="font-semibold mb-1 text-gray">{t('Căn cứ đề xuất của tác giả')}:</p>
                  <p className="leading-relaxed [overflow-wrap:anywhere]">{meta.proposedTierRationale}</p>
                </div>
              )}
            </div>
          )}
        </dl>
      </section>

      {/* Chunks List (Immutable content + per-chunk comment box) */}
      <section aria-label={t('Các đoạn trích kiến thức')} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-lg">
              segment
            </span>
            <span>{t('Các đoạn trích kiến thức cần thẩm định ({0})', [revision.chunks.length])}</span>
          </h2>
        </div>

        {revision.chunks.map((c, idx) => (
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

            {/* Content / Normalized Guidance */}
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

            {/* Applicability & Measurement Notes */}
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

            {/* Chunk Comment Area (Only interactive for active reviewer) */}
            {isActive && isAssignedExpert ? (
              <div className="pt-2 border-t border-border/60 space-y-1 text-xs">
                <label
                  htmlFor={`chunk-comment-input-${c.chunkId}`}
                  className="font-semibold text-gray block flex items-center gap-1.5"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-sm text-teal">
                    comment
                  </span>
                  <span>{t('Góp ý chuyên môn cho đoạn trích này (không bắt buộc)')}:</span>
                </label>
                <textarea
                  id={`chunk-comment-input-${c.chunkId}`}
                  data-testid={`chunk-comment-input-${c.chunkId}`}
                  rows={2}
                  value={chunkComments[c.chunkId] || ''}
                  onChange={e => handleChunkCommentChange(c.chunkId, e.target.value)}
                  placeholder={t('Nhập nhận xét cụ thể nếu cần tác giả chỉnh sửa lại đoạn trích này...')}
                  className="w-full rounded-xl border border-border bg-bg p-2.5 text-xs text-text placeholder:text-gray/60 focus:outline-none focus:border-teal"
                />
              </div>
            ) : null}
          </div>
        ))}
      </section>

      {/* Completed Decision View */}
      {isCompleted && decision && (
        <section
          data-testid="completed-decision-card"
          aria-label={t('Quyết định thẩm định đã ban hành')}
          className="rounded-2xl border border-teal/40 bg-surface p-5 md:p-6 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-teal text-2xl">
                verified
              </span>
              <h2 className="text-base font-bold text-text">
                {t('Quyết định thẩm định đã hoàn thành')}
              </h2>
            </div>
            <DecisionOutcomeBadge outcome={decision.outcome} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray block mb-1">{t('Ngày thẩm định')}:</span>
              <span className="font-semibold text-text font-mono">{formatDate(decision.decidedAt)}</span>
            </div>

            {decision.assessedTier && (
              <div>
                <span className="text-gray block mb-1">{t('Tầng tri thức được xác nhận')}:</span>
                <KnowledgeTierBadge tier={decision.assessedTier} showDesc />
              </div>
            )}

            <div className="md:col-span-2">
              <span className="text-gray block mb-1 font-semibold">{t('Nhận xét chuyên môn')}:</span>
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
          </div>
        </section>
      )}

      {/* Professional Decision Workspace Form (ACTIVE EXPERT only) */}
      {isActive && isAssignedExpert && (
        <section
          data-testid="decision-form-section"
          aria-label={t('Biểu mẫu quyết định thẩm định')}
          className="rounded-2xl border border-teal/30 bg-surface p-5 md:p-6 shadow-2xs space-y-5"
        >
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-teal text-xl">
                gavel
              </span>
              <span>{t('Biểu mẫu quyết định thẩm định chuyên môn')}</span>
            </h2>
            <p className="text-xs text-gray mt-1">
              {t('Tuân thủ chính sách phân tầng DURI-1B-v1. Quyết định có tính bất biến và truy nguyên sau khi ban hành.')}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Conflict of Interest Declaration */}
            <div className="p-3.5 rounded-xl bg-bg border border-border space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="conflict-of-interest-checkbox"
                  checked={noConflictConfirmed}
                  onChange={e => setNoConflictConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray text-teal focus:ring-teal"
                />
                <span className="font-semibold text-text leading-snug">
                  {t('Tôi cam đoan KHÔNG có xung đột lợi ích đối với hồ sơ này và không phải là tác giả hoặc đồng tác giả của tài liệu nguồn.')}
                </span>
              </label>
              {!noConflictConfirmed && (
                <p className="text-[11px] text-coral pl-6">
                  {t('* Bắt buộc phải cam kết không có xung đột lợi ích để tiến hành ban hành quyết định.')}
                </p>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-2 border-t border-border pt-3">
              <span className="font-semibold text-gray block">{t('Danh mục kiểm tra chuyên môn (Bắt buộc với Phê duyệt)')}:</span>
              <div className="space-y-2 pl-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="checklist-source"
                    checked={checkedSource}
                    onChange={e => setCheckedSource(e.target.checked)}
                    className="w-4 h-4 rounded border-gray text-teal focus:ring-teal"
                  />
                  <span className="text-text">{t('Đã đối chiếu tài liệu nguồn / chứng cứ xuất xứ rõ ràng.')}</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="checklist-faithfulness"
                    checked={checkedFaithfulness}
                    onChange={e => setCheckedFaithfulness(e.target.checked)}
                    className="w-4 h-4 rounded border-gray text-teal focus:ring-teal"
                  />
                  <span className="text-text">{t('Đã kiểm tra tính trung thực, không suy diễn hoặc cắt xén sai lệch.')}</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="checklist-applicability"
                    checked={checkedApplicability}
                    onChange={e => setCheckedApplicability(e.target.checked)}
                    className="w-4 h-4 rounded border-gray text-teal focus:ring-teal"
                  />
                  <span className="text-text">{t('Đã thẩm định phạm vi và điều kiện áp dụng thực tế trên sầu riêng.')}</span>
                </label>
              </div>
            </div>

            {/* Decision Outcome Radio Group */}
            <div className="space-y-2 border-t border-border pt-3">
              <label className="font-semibold text-gray block">
                {t('Kết luận thẩm định')} <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] as const).map(opt => {
                  const isSelected = outcome === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      data-testid={`outcome-radio-${opt}`}
                      onClick={() => {
                        setOutcome(opt);
                        if (opt === 'APPROVED' && assessedTier === 'UNKNOWN') {
                          setAssessedTier('B');
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? opt === 'APPROVED'
                            ? 'border-teal bg-teal/10 shadow-xs'
                            : opt === 'CHANGES_REQUESTED'
                            ? 'border-amber bg-amber/10 shadow-xs'
                            : 'border-coral bg-coral/10 shadow-xs'
                          : 'border-border bg-surface hover:bg-bg'
                      }`}
                    >
                      <div className="font-semibold">
                        <DecisionOutcomeBadge outcome={opt} />
                      </div>
                      <span
                        aria-hidden="true"
                        className={`material-symbols-outlined text-lg ${
                          isSelected ? 'text-teal' : 'text-gray/40'
                        }`}
                      >
                        {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assessed Tier Selector */}
            <div className="space-y-2 border-t border-border pt-3">
              <label className="font-semibold text-gray block">
                {t('Tầng tri thức được xác nhận (Chính sách DURI-1B-v1)')} <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(['A', 'B', 'C', 'D', 'E', 'UNKNOWN'] as const).map(tKey => {
                  const tConf = TIER_CONFIG[tKey];
                  const isSelected = assessedTier === tKey;
                  const isDisallowedForApproved = outcome === 'APPROVED' && tKey === 'UNKNOWN';

                  return (
                    <button
                      key={tKey}
                      type="button"
                      data-testid={`tier-option-${tKey}`}
                      disabled={isDisallowedForApproved}
                      onClick={() => setAssessedTier(tKey)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isDisallowedForApproved
                          ? 'opacity-30 cursor-not-allowed bg-bg border-border'
                          : isSelected
                          ? 'border-teal bg-teal/10 shadow-xs cursor-pointer'
                          : 'border-border bg-surface hover:bg-bg cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-text">{t(tConf.label)}</span>
                        {isSelected && (
                          <span aria-hidden="true" className="material-symbols-outlined text-teal text-sm">
                            check
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray leading-tight">{t(tConf.desc)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tier Rationale */}
            {assessedTier !== 'UNKNOWN' && (
              <div className="space-y-1">
                <label htmlFor="tier-rationale-input" className="font-semibold text-gray block">
                  {t('Căn cứ xếp tầng tri thức')} <span className="text-coral">*</span>
                </label>
                <textarea
                  id="tier-rationale-input"
                  data-testid="tier-rationale-input"
                  rows={2}
                  value={tierRationale}
                  onChange={e => setTierRationale(e.target.value)}
                  placeholder={t('Nêu rõ căn cứ xác nhận tầng (ví dụ: Quyết định ban hành số... của Cục Bảo vệ thực vật...)')}
                  className="w-full rounded-xl border border-border bg-bg p-3 text-xs text-text placeholder:text-gray/60 focus:outline-none focus:border-teal"
                />
                <div className="flex items-center justify-between text-[11px] text-gray">
                  <span>{t('Tối thiểu 3 ký tự, tối đa 4000 ký tự.')}</span>
                  <span className={trimmedTierRationale.length > 4000 ? 'text-coral font-bold' : ''}>
                    {trimmedTierRationale.length}/4000
                  </span>
                </div>
              </div>
            )}

            {/* Decision Reason */}
            <div className="space-y-1">
              <label htmlFor="decision-reason-input" className="font-semibold text-gray block">
                {t('Nhận xét chuyên môn / Lý do quyết định')} <span className="text-coral">*</span>
              </label>
              <textarea
                id="decision-reason-input"
                data-testid="decision-reason-input"
                rows={4}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('Nhận xét tổng quan về tính khoa học, độ tin cậy và khả năng áp dụng của tài liệu nguồn...')}
                className="w-full rounded-xl border border-border bg-bg p-3 text-xs text-text placeholder:text-gray/60 focus:outline-none focus:border-teal"
              />
              <div className="flex items-center justify-between text-[11px] text-gray">
                <span>{t('Tối thiểu 3 ký tự, tối đa 4000 ký tự.')}</span>
                <span className={trimmedReason.length > 4000 ? 'text-coral font-bold' : ''}>
                  {trimmedReason.length}/4000
                </span>
              </div>
            </div>

            {/* Indeterminate Outcome Warning Banner */}
            {mustVerifyReload && (
              <div
                data-testid="decision-indeterminate-warning"
                className="p-4 rounded-xl border border-amber/40 bg-amber/10 text-amber text-xs space-y-2"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    warning
                  </span>
                  <span>{t('Kết quả thao tác trước đó chưa xác định')}</span>
                </div>
                <p className="text-[11px] text-text/80 leading-relaxed">
                  {t(
                    'Đã xảy ra xung đột phiên bản hoặc gián đoạn mạng khi gửi quyết định. Bạn cần tải lại dữ liệu để xác minh trạng thái nhiệm vụ trước khi ban hành.'
                  )}
                </p>
                <button
                  type="button"
                  data-testid="workspace-verify-reload-button"
                  onClick={() => loadData(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-surface dark:text-bg font-semibold hover:opacity-90 cursor-pointer text-xs"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    refresh
                  </span>
                  <span>{t('Tải lại dữ liệu và đồng bộ phiên bản')}</span>
                </button>
              </div>
            )}

            {/* Form Validation Errors Box */}
            {formValidationErrors.length > 0 && (
              <div className="p-3.5 rounded-xl border border-coral/30 bg-coral/10 text-coral space-y-1 text-xs">
                <span className="font-bold flex items-center gap-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    info
                  </span>
                  <span>{t('Vui lòng hoàn thiện các yêu cầu sau trước khi ban hành')}:</span>
                </span>
                <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5">
                  {formValidationErrors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                data-testid="open-decision-confirm-button"
                disabled={!isDecisionFormValid || mustVerifyReload}
                onClick={() => setIsConfirmModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-2"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  verified
                </span>
                <span>{t('Ban hành quyết định thẩm định')}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && assignment && assignment.id === assignmentId && (
        <ExpertDecisionConfirmModal
          assignment={assignment}
          decisionData={prepareDecisionPayload()}
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onSuccess={handleDecisionSuccess}
          onReload={() => loadData(true)}
          mustVerifyReload={mustVerifyReload}
          onIndeterminateError={() => setMustVerifyReload(true)}
        />
      )}
    </div>
  );
}
