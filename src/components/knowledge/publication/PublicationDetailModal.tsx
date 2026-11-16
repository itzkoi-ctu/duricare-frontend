import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import {
  getPublicationDetail,
  getJobDetail,
  listPublicationEvents,
  parsePublicationError,
} from '../../../api/publication';
import type {
  PublicationDetail,
  JobDetail,
  PublicationEvent,
  PublicationSummary,
  PublicationHead,
  JobKind,
} from '../../../types/publication';

interface PublicationDetailModalProps {
  publicationId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestRevoke?: (pub: PublicationSummary, head: PublicationHead) => void;
  onRequestRetry?: (targetId: string, kind: JobKind, head: PublicationHead, title: string) => void;
}

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

export default function PublicationDetailModal({
  publicationId,
  isOpen,
  onClose,
  onRequestRevoke,
  onRequestRetry,
}: PublicationDetailModalProps) {
  useLanguage();

  const [activeTab, setActiveTab] = useState<'manifest' | 'jobs' | 'events'>('jobs');
  const [detail, setDetail] = useState<PublicationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected job for runs inspector
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobDetail | null>(null);
  const [loadingJobDetail, setLoadingJobDetail] = useState<boolean>(false);

  // Events list state
  const [events, setEvents] = useState<PublicationEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const sessionRef = useRef<number>(0);
  const eventsSessionRef = useRef<number>(0);
  const jobSelectionSessionRef = useRef<number>(0);
  const selectedJobIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen && publicationId) {
      sessionRef.current += 1;
      const session = sessionRef.current;
      setLoading(true);
      setError(null);
      setDetail(null);
      setSelectedJobId(null);
      setSelectedJobDetail(null);
      setEvents([]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      getPublicationDetail(publicationId, controller.signal)
        .then((res) => {
          if (!isMountedRef.current || sessionRef.current !== session) return;
          setDetail(res);
          setLoading(false);
        })
        .catch((err) => {
          if (!isMountedRef.current || sessionRef.current !== session) return;
          const parsed = parsePublicationError(err, t('Không thể tải chi tiết bản xuất bản.'));
          setError(parsed.message);
          setLoading(false);
        });
    } else {
      sessionRef.current += 1;
      abortControllerRef.current?.abort();
      setDetail(null);
      setLoading(false);
      setError(null);
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [isOpen, publicationId]);

  // Load events when switching to events tab
  useEffect(() => {
    if (isOpen && activeTab === 'events' && publicationId && events.length === 0) {
      eventsSessionRef.current += 1;
      const session = eventsSessionRef.current;
      setLoadingEvents(true);
      listPublicationEvents(publicationId)
        .then((res) => {
          if (isMountedRef.current && eventsSessionRef.current === session) {
            setEvents(res.content);
            setLoadingEvents(false);
          }
        })
        .catch(() => {
          if (isMountedRef.current && eventsSessionRef.current === session) {
            setLoadingEvents(false);
          }
        });
    }
  }, [isOpen, activeTab, publicationId, events.length]);

  // Load job details when a job is clicked
  const handleSelectJob = async (jobId: string) => {
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
      selectedJobIdRef.current = null;
      setSelectedJobDetail(null);
      return;
    }
    jobSelectionSessionRef.current += 1;
    const session = jobSelectionSessionRef.current;
    setSelectedJobId(jobId);
    selectedJobIdRef.current = jobId;
    setSelectedJobDetail(null);
    setLoadingJobDetail(true);
    try {
      const res = await getJobDetail(jobId);
      if (
        isMountedRef.current &&
        jobSelectionSessionRef.current === session &&
        selectedJobIdRef.current === jobId
      ) {
        setSelectedJobDetail(res);
        setLoadingJobDetail(false);
      }
    } catch {
      if (
        isMountedRef.current &&
        jobSelectionSessionRef.current === session &&
        selectedJobIdRef.current === jobId
      ) {
        setLoadingJobDetail(false);
      }
    }
  };

  if (!isOpen) return null;

  const pub = detail?.publication;
  const manifest = detail?.manifest;
  const head = detail?.head;
  const fingerprint = detail?.fingerprint;
  const jobs = detail?.jobs.content || [];

  const latestJob = jobs[0];
  const canRetryIndex =
    pub?.status === 'PENDING' &&
    latestJob?.kind === 'INDEX' &&
    latestJob?.status === 'FAILED';

  const canRevoke = pub && pub.status !== 'REVOKED';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pub-detail-title"
      data-testid="publication-detail-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-xl max-w-[660px] w-full max-h-[min(90vh,calc(100vh-2rem))] shadow-xl flex flex-col overflow-hidden text-text my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="pub-detail-title" className="text-base sm:text-lg font-semibold text-text">
              {t('Chi tiết xuất bản vào RAG')}
            </h2>
            {pub && (
              <>
                <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center">
                  {t('Trạng thái: {0}', [pub.status])}
                </span>
                <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center">
                  {t('Bản {0}', [pub.revisionNumber])}
                </span>
                <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none bg-slate-100 dark:bg-surface text-slate-700 dark:text-text border border-slate-200 dark:border-border inline-flex items-center">
                  {t('Tầng {0}', [pub.assessedTier || 'A'])}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            data-testid="close-publication-detail-modal-button"
            onClick={onClose}
            aria-label={t('Đóng')}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-gray hover:bg-surface-hover hover:text-text transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              close
            </span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-6 bg-slate-50/50 dark:bg-surface-hover/20 shrink-0">
          <button
            type="button"
            data-testid="detail-tab-manifest"
            onClick={() => setActiveTab('manifest')}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'manifest'
                ? 'font-semibold text-primary border-primary bg-surface dark:bg-bg'
                : 'border-transparent text-gray hover:text-text'
            }`}
          >
            {t('Nội dung xuất bản')}
          </button>
          <button
            type="button"
            data-testid="detail-tab-jobs"
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'jobs'
                ? 'font-semibold text-primary border-primary bg-surface dark:bg-bg'
                : 'border-transparent text-gray hover:text-text'
            }`}
          >
            {t('Tác vụ xử lý (Jobs)')} {jobs.length > 0 && `(${jobs.length})`}
          </button>
          <button
            type="button"
            data-testid="detail-tab-events"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'events'
                ? 'font-semibold text-primary border-primary bg-surface dark:bg-bg'
                : 'border-transparent text-gray hover:text-text'
            }`}
          >
            {t('Lịch sử thay đổi')}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray">{t('Đang tải dữ liệu xuất bản...')}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-base text-red-600">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {detail && pub && (
            <>
              {/* Tab 1: Manifest */}
              {activeTab === 'manifest' && manifest && (
                <div className="space-y-4">
                  {/* Fingerprint Card */}
                  {fingerprint && (
                    <div className="p-4 rounded-lg border border-border bg-surface dark:bg-bg space-y-2">
                      <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                        {t('Vector Fingerprint & Model')}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-gray text-[11px] block">{t('Collection')}:</span>
                          <span className="text-text">{fingerprint.collection}</span>
                        </div>
                        <div>
                          <span className="text-gray text-[11px] block">{t('Model')}:</span>
                          <span className="text-text">
                            {fingerprint.embeddingModelId} ({fingerprint.embeddingModelRevision})
                          </span>
                        </div>
                        <div>
                          <span className="text-gray text-[11px] block">{t('Chiều vector / Khoảng cách')}:</span>
                          <span className="text-text">
                            {fingerprint.dimension} / {fingerprint.distance}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chunks List */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                      {t('Danh sách đoạn trích Allowlisted ({0} đoạn trích)', [manifest.chunks.length])}
                    </h4>
                    {manifest.chunks.map((chk) => (
                      <div
                        key={chk.chunkId}
                        className="p-3.5 rounded-lg border border-border bg-surface dark:bg-bg space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-text">
                            #{chk.position + 1}. {chk.chunkTitle}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface text-gray border border-border">
                              {chk.topic}
                            </span>
                            {chk.stage && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface text-gray border border-border">
                                {chk.stage}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-text whitespace-pre-line leading-relaxed text-xs">
                          {chk.content}
                        </p>
                        <div className="text-[11px] text-gray font-mono pt-1 border-t border-border">
                          <span>{t('Vị trí trích dẫn')}:</span> {chk.locator}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Jobs */}
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  {jobs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray border border-dashed border-border rounded-lg">
                      {t('Chưa có tác vụ nào được ghi nhận cho bản xuất bản này.')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-4 rounded-lg border border-border bg-surface dark:bg-bg space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none inline-flex items-center font-mono ${
                                  job.status === 'SUCCEEDED'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : job.status === 'FAILED'
                                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                }`}
                              >
                                {job.status}
                              </span>
                              <span className="font-semibold text-text">
                                {t('Giai đoạn:')} {job.phase || job.kind}
                              </span>
                            </div>
                            <span className="text-gray">
                              {t('Số lần nhận tác vụ: {0} / tối đa {1}', [job.claimCount, job.maxClaims])}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-gray pt-1 border-t border-border">
                            <span>
                              {t('Khởi tạo:')} {formatDate(job.createdAt)} · {t('Cập nhật:')} {formatDate(job.updatedAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectJob(job.id)}
                              className="text-xs text-primary font-medium hover:underline cursor-pointer"
                            >
                              {selectedJobId === job.id ? t('Ẩn chi tiết') : t('Xem chi tiết tác vụ & thông số chạy')}
                            </button>
                          </div>

                          {/* Runs Inspector */}
                          {selectedJobId === job.id && (
                            <div className="mt-3 p-3.5 rounded-lg border border-primary/20 bg-slate-50 dark:bg-surface space-y-2.5">
                              <div className="flex items-center justify-between border-b border-border pb-2">
                                <div className="font-semibold text-text flex items-center gap-2">
                                  <span aria-hidden="true" className="material-symbols-outlined text-primary text-lg">
                                    receipt_long
                                  </span>
                                  <span>{t('Bản ghi kiểm chứng (RunSummary)')}</span>
                                </div>
                                {selectedJobDetail?.runs?.content && selectedJobDetail.runs.content.length > 0 && (
                                  <span className="text-xs text-gray font-mono">
                                    {selectedJobDetail.runs.content.length} {t('lượt chạy')}
                                  </span>
                                )}
                              </div>

                              {loadingJobDetail ? (
                                <div className="py-4 text-center text-xs text-gray">
                                  {t('Đang tải danh sách lượt chạy...')}
                                </div>
                              ) : selectedJobDetail?.runs.content.length === 0 ? (
                                <p className="text-xs text-gray italic">
                                  {t('Chưa có lượt chạy nào được ghi nhận cho tác vụ này.')}
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {selectedJobDetail?.runs.content.map((run) => {
                                    const isOk = run.status === 'VERIFIED' || run.status === 'SUCCEEDED';
                                    const isFailed = run.status === 'FAILED';
                                    const isRunning = run.status === 'RUNNING';
                                    const badgeClass = isOk
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                      : isFailed
                                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                      : isRunning
                                      ? 'bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';

                                    return (
                                      <div
                                        key={run.id}
                                        data-testid={`run-summary-card-${run.id}`}
                                        className="p-2.5 rounded-lg border border-border bg-surface dark:bg-bg text-xs font-mono space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                          <span className="text-xs text-gray font-mono">ID: {run.id.slice(0, 8)}...</span>
                                          <span
                                            data-testid={`run-status-badge-${run.id}`}
                                            className={`h-6 px-2.5 rounded-[6px] text-xs font-semibold leading-none border inline-flex items-center font-mono ${badgeClass}`}
                                          >
                                            {run.status}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <span className="text-gray">{t('Điểm dữ liệu dự kiến:')}</span>
                                            <span className="font-semibold text-text ml-1">
                                              expectedPoints: {run.expectedPoints}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray">{t('Điểm dữ liệu đã xác minh:')}</span>
                                            <span className="font-semibold text-text ml-1">
                                              verifiedPoints: {run.verifiedPoints}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray">{t('Hàng rào kiểm soát:')}</span>
                                            <span className="font-semibold text-text ml-1">
                                              fence: {run.fence}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray">{t('Thời gian bắt đầu:')}</span>
                                            <span className="text-text ml-1">
                                              {formatDate(run.startedAt)}
                                            </span>
                                          </div>
                                          {run.finishedAt && (
                                            <div className="col-span-2">
                                              <span className="text-gray">{t('Thời gian hoàn thành:')}</span>
                                              <span className="text-text ml-1">
                                                {formatDate(run.finishedAt)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {run.errorCode && (
                                          <div className="text-red-600 dark:text-red-400 text-xs pt-1 font-sans">
                                            {t('Mã lỗi:')} <span className="font-mono font-semibold">{run.errorCode}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Technical disclosure */}
                  <details className="group border border-border rounded-lg text-xs">
                    <summary className="px-3 py-2 cursor-pointer bg-surface font-medium text-gray flex items-center justify-between select-none">
                      <span>{t('Chi tiết kỹ thuật & Dấu vân tay dữ liệu')}{fingerprint?.dimension ? ` (${fingerprint.dimension} dims)` : ''}</span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-sm transition-transform group-open:rotate-180"
                      >
                        expand_more
                      </span>
                    </summary>
                    <div className="p-3 border-t border-border font-mono bg-slate-50 dark:bg-bg text-gray break-all space-y-1">
                      <div>vectorModel: {fingerprint?.embeddingModelId || t('Chưa xác định')} · dimensions: {fingerprint?.dimension ?? t('Chưa xác định')}</div>
                      <div>dataFingerprint: {pub.manifestHash}</div>
                    </div>
                  </details>
                </div>
              )}

              {/* Tab 3: Events */}
              {activeTab === 'events' && (
                <div className="space-y-3">
                  {loadingEvents ? (
                    <div className="py-6 text-center text-xs text-gray">
                      {t('Đang tải nhật ký sự kiện...')}
                    </div>
                  ) : events.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray border border-dashed border-border rounded-lg">
                      {t('Chưa có sự kiện nào được ghi nhận.')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {events.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-3 rounded-lg border border-border bg-surface dark:bg-bg text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold font-mono text-primary">
                                {evt.action}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface text-gray border border-border">
                                {evt.actorKind}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray font-mono">
                              {formatDate(evt.occurredAt)}
                            </span>
                          </div>
                          {evt.reason && (
                            <p className="text-text text-[11px] italic bg-slate-50 dark:bg-surface p-2 rounded-lg">
                              &ldquo;{evt.reason}&rdquo;
                            </p>
                          )}
                          {(evt.previousStatus || evt.newStatus) && (
                            <div className="text-[10px] text-gray font-mono">
                              {evt.previousStatus || 'NONE'} → {evt.newStatus || 'NONE'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-surface-hover/30 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            data-testid="close-publication-detail-modal-button"
            onClick={onClose}
            className="h-11 px-5 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface-hover transition-colors shadow-xs cursor-pointer"
          >
            {t('Đóng')}
          </button>
          {canRevoke && onRequestRevoke && head && pub && (
            <button
              type="button"
              data-testid="detail-revoke-button"
              onClick={() => onRequestRevoke(pub, head)}
              className="h-11 px-5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              {t('Thu hồi tri thức')}
            </button>
          )}
          {canRetryIndex && onRequestRetry && head && pub && (
            <button
              type="button"
              data-testid="detail-retry-index-button"
              onClick={() => onRequestRetry(pub.id, 'INDEX', head, pub.sourceTitle)}
              className="h-11 px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              {t('Thử lại chỉ mục')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
