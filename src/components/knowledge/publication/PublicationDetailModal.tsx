import { useState, useEffect, useRef } from 'react';
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
import PublicationStatusBadge from './PublicationStatusBadge';
import { JobStatusBadge, JobKindBadge } from './JobStatusBadge';

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

  const [activeTab, setActiveTab] = useState<'manifest' | 'jobs' | 'events'>('manifest');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pub-detail-title"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border bg-surface shadow-2xl flex flex-col my-8">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border p-5 shrink-0">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-2xl">
              dataset
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="pub-detail-title" className="text-base md:text-lg font-bold text-text">
                  {pub ? pub.sourceTitle : t('Chi tiết bản xuất bản')}
                </h2>
                {pub && <PublicationStatusBadge status={pub.status} size="sm" />}
              </div>
              {pub && (
                <p className="text-xs text-gray font-mono mt-0.5">
                  Rev #{pub.revisionNumber} • Gen #{pub.generation} • {formatDate(pub.createdAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRetryIndex && onRequestRetry && head && pub && (
              <button
                type="button"
                data-testid="detail-retry-index-button"
                onClick={() => onRequestRetry(pub.id, 'INDEX', head, pub.sourceTitle)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  refresh
                </span>
                <span>{t('Thử lại chỉ mục')}</span>
              </button>
            )}

            {canRevoke && onRequestRevoke && head && pub && (
              <button
                type="button"
                data-testid="detail-revoke-button"
                onClick={() => onRequestRevoke(pub, head)}
                className="px-3 py-1.5 rounded-xl bg-coral/10 hover:bg-coral/20 text-coral border border-coral/30 text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  block
                </span>
                <span>{t('Thu hồi')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors"
              title={t('Đóng')}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-5 grow">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-teal/30 border-t-teal rounded-full animate-spin" />
              <span className="text-xs text-gray">{t('Đang tải dữ liệu xuất bản...')}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-800 text-xs flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-base text-red-600">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {detail && pub && (
            <>
              {/* Publication Head & Metadata Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-border bg-bg space-y-1">
                  <span className="text-gray text-[11px] block">{t('Head Version')}</span>
                  <span className="font-semibold font-mono text-text">v{head?.version}</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-bg space-y-1">
                  <span className="text-gray text-[11px] block">{t('Tầng tin cậy')}</span>
                  <span className="font-semibold font-mono text-text">{pub.assessedTier} (DURI-1B-v1)</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-bg space-y-1">
                  <span className="text-gray text-[11px] block">{t('Số đoạn trích (Chunks)')}</span>
                  <span className="font-semibold font-mono text-text">{pub.chunkCount}</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-bg space-y-1">
                  <span className="text-gray text-[11px] block">{t('Manifest Hash')}</span>
                  <span className="font-mono text-[10px] text-gray truncate block" title={pub.manifestHash}>
                    {pub.manifestHash.slice(0, 16)}...
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-3 border-b border-border pb-1">
                <button
                  type="button"
                  data-testid="detail-tab-manifest"
                  onClick={() => setActiveTab('manifest')}
                  className={`pb-2 px-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'manifest'
                      ? 'border-teal text-teal dark:border-teal-400 dark:text-teal-400'
                      : 'border-transparent text-gray hover:text-text'
                  }`}
                >
                  {t('Manifest & Fingerprint')}
                </button>
                <button
                  type="button"
                  data-testid="detail-tab-jobs"
                  onClick={() => setActiveTab('jobs')}
                  className={`pb-2 px-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'jobs'
                      ? 'border-teal text-teal dark:border-teal-400 dark:text-teal-400'
                      : 'border-transparent text-gray hover:text-text'
                  }`}
                >
                  {t('Tác vụ xử lý')} ({jobs.length})
                </button>
                <button
                  type="button"
                  data-testid="detail-tab-events"
                  onClick={() => setActiveTab('events')}
                  className={`pb-2 px-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'events'
                      ? 'border-teal text-teal dark:border-teal-400 dark:text-teal-400'
                      : 'border-transparent text-gray hover:text-text'
                  }`}
                >
                  {t('Nhật ký sự kiện')}
                </button>
              </div>

              {/* Tab 1: Manifest & Fingerprint */}
              {activeTab === 'manifest' && manifest && (
                <div className="space-y-4">
                  {/* Fingerprint Card */}
                  {fingerprint && (
                    <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2">
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
                          <span className="text-text">{fingerprint.embeddingModelId} ({fingerprint.embeddingModelRevision})</span>
                        </div>
                        <div>
                          <span className="text-gray text-[11px] block">{t('Chiều vector / Khoảng cách')}:</span>
                          <span className="text-text">{fingerprint.dimension} / {fingerprint.distance}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manifest Chunks List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                      {t('Danh sách đoạn trích Allowlisted ({0} đoạn trích)', [manifest.chunks.length])}
                    </h4>
                    <div className="space-y-2.5">
                      {manifest.chunks.map((chk) => (
                        <div
                          key={chk.chunkId}
                          className="p-3.5 rounded-xl border border-border bg-surface space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-text">
                              #{chk.position + 1}. {chk.chunkTitle}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-bg text-gray border border-border">
                                {chk.topic}
                              </span>
                              {chk.stage && (
                                <span className="px-2 py-0.5 rounded bg-bg text-gray border border-border">
                                  {chk.stage}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-text whitespace-pre-line leading-relaxed text-xs">
                            {chk.content}
                          </p>
                          <div className="text-[11px] text-gray font-mono pt-1 border-t border-border/50">
                            <span>{t('Vị trí trích dẫn')}:</span> {chk.locator}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Jobs & Runs */}
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  {jobs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray border border-dashed border-border rounded-xl">
                      {t('Chưa có tác vụ nào được ghi nhận cho bản xuất bản này.')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-4 rounded-xl border border-border bg-surface space-y-3 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/70 pb-2">
                            <div className="flex items-center gap-2">
                              <JobKindBadge kind={job.kind} />
                              <JobStatusBadge status={job.status} />
                              {job.phase && (
                                <span className="text-[11px] text-gray font-mono">
                                  Phase: {job.phase}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {job.kind === 'CLEANUP' && job.status === 'FAILED' && onRequestRetry && head && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRequestRetry(job.id, 'CLEANUP', head, `Cleanup #${job.id.slice(0, 8)}`)
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-xs">
                                    refresh
                                  </span>
                                  <span>{t('Thử lại dọn dẹp')}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSelectJob(job.id)}
                                className="px-2.5 py-1 rounded-lg border border-border bg-bg hover:bg-surface text-text text-xs font-semibold cursor-pointer transition-colors"
                              >
                                {selectedJobId === job.id ? t('Ẩn lượt chạy') : t('Xem lượt chạy (Runs)')}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-gray text-[11px] block">{t('Số lần claim')}:</span>
                              <span className="text-text">{job.claimCount} / {job.maxClaims}</span>
                            </div>
                            <div>
                              <span className="text-gray text-[11px] block">{t('Mã lỗi')}:</span>
                              <span className={`text-[11px] ${job.errorCode ? 'text-coral font-bold' : 'text-gray'}`}>
                                {job.errorCode || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray text-[11px] block">{t('Tạo lúc')}:</span>
                              <span className="text-text">{formatDate(job.createdAt)}</span>
                            </div>
                            <div>
                              <span className="text-gray text-[11px] block">{t('Cập nhật lúc')}:</span>
                              <span className="text-text">{formatDate(job.updatedAt)}</span>
                            </div>
                          </div>

                          {/* Runs Inspector for selected job */}
                          {selectedJobId === job.id && (
                            <div className="mt-3 p-3.5 rounded-xl border border-teal/20 bg-bg space-y-2.5">
                              <h5 className="text-xs font-bold text-text flex items-center gap-1.5">
                                <span aria-hidden="true" className="material-symbols-outlined text-sm text-teal">
                                  play_arrow
                                </span>
                                <span>{t('Chi tiết lượt chạy (Runs)')}</span>
                              </h5>

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
                                  {selectedJobDetail?.runs.content.map((run) => (
                                    <div
                                      key={run.id}
                                      className="p-2.5 rounded-lg border border-border bg-surface text-xs font-mono space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-text">
                                          Fence #{run.fence} • {run.status}
                                        </span>
                                        <span className="text-[11px] text-gray">
                                          {formatDate(run.startedAt)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] text-gray">
                                        <span>
                                          Points: {run.verifiedPoints} / {run.expectedPoints}
                                        </span>
                                        {run.errorCode && (
                                          <span className="text-coral">Lỗi: {run.errorCode}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
                    <div className="p-6 text-center text-xs text-gray border border-dashed border-border rounded-xl">
                      {t('Chưa có sự kiện nào được ghi nhận.')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {events.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-3 rounded-xl border border-border bg-surface text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold font-mono text-teal">
                                {evt.action}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg text-gray border border-border">
                                {evt.actorKind}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray font-mono">
                              {formatDate(evt.occurredAt)}
                            </span>
                          </div>
                          {evt.reason && (
                            <p className="text-text text-[11px] italic bg-bg/50 p-2 rounded-lg">
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
      </div>
    </div>
  );
}
