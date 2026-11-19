import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
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
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} UTC+7`;
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

function getJobErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case 'RATE_LIMITED':
      return 'Nhà cung cấp giới hạn yêu cầu. Kiểm tra tác vụ trước khi thử lại.';
    case 'EMBEDDING_TIMEOUT':
      return 'Quá thời gian kết nối hoặc xử lý từ dịch vụ embedding.';
    case 'VECTOR_UNAVAILABLE':
      return 'Cơ sở dữ liệu vector tạm thời không phản hồi.';
    case 'MANIFEST_MISMATCH':
      return 'Dữ liệu manifest không khớp với dữ liệu snapshot đã duyệt.';
    case 'FINGERPRINT_MISMATCH':
      return 'Cấu hình vector fingerprint đã thay đổi trên hệ thống.';
    case 'GATE_UNAVAILABLE':
      return 'Cổng xuất bản đang tạm thời đóng bởi chính sách hệ thống.';
    default:
      return 'Tác vụ gặp lỗi trong quá trình xử lý.';
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
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsLoaded, setEventsLoaded] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const sessionRef = useRef<number>(0);
  const eventsSessionRef = useRef<number>(0);
  const jobSelectionSessionRef = useRef<number>(0);
  const selectedJobIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadEvents = (targetPubId: string) => {
    eventsSessionRef.current += 1;
    const session = eventsSessionRef.current;
    setLoadingEvents(true);
    setEventsError(null);
    listPublicationEvents(targetPubId)
      .then((res) => {
        if (!isMountedRef.current || eventsSessionRef.current !== session) return;
        setEvents(res.content || []);
        setEventsLoaded(true);
        setLoadingEvents(false);
      })
      .catch((err) => {
        if (!isMountedRef.current || eventsSessionRef.current !== session) return;
        const parsed = parsePublicationError(err, t('Không thể tải nhật ký sự kiện.'));
        setEventsError(parsed.message || t('Không thể tải nhật ký sự kiện.'));
        setLoadingEvents(false);
      });
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen && publicationId) {
      sessionRef.current += 1;
      const session = sessionRef.current;
      setLoading(true);
      setError(null);
      setDetail(null);
      setSelectedJobId(null);
      selectedJobIdRef.current = null;
      setSelectedJobDetail(null);
      setEvents([]);
      setEventsLoaded(false);
      setLoadingEvents(false);
      setEventsError(null);
      eventsSessionRef.current += 1;
      setActiveTab('jobs');

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
      setEvents([]);
      setEventsLoaded(false);
      setLoadingEvents(false);
      setEventsError(null);
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [isOpen, publicationId]);

  // Load events when switching to events tab
  useEffect(() => {
    if (isOpen && activeTab === 'events' && publicationId && !eventsLoaded && !loadingEvents && !eventsError) {
      loadEvents(publicationId);
    }
  }, [isOpen, activeTab, publicationId, eventsLoaded, loadingEvents, eventsError]);

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
      data-purpose="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto animate-in fade-in"
    >
      <div
        data-purpose="publication-details-dialog"
        className="w-full max-w-[960px] max-h-[90dvh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[#e2e8f0] animate-in zoom-in-95 duration-150 my-auto text-[#1e293b]"
      >
        {/* Modal Header (Fixed at top) */}
        <div className="p-4 sm:p-6 border-b border-[#e2e8f0] bg-white shrink-0 space-y-3" data-purpose="modal-header">
          {/* Row 1: Title, Status Badges, Secondary Link, Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-[#1e293b] tracking-tight" id="pub-detail-title">
                {t('Chi tiết xuất bản')}
              </h2>
              {pub && (
                <>
                  <span
                    data-preview-badge="true"
                    className="inline-flex items-center h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]"
                  >
                    {t('Bản {0}', [pub.revisionNumber])}
                  </span>
                  <span
                    data-preview-badge="true"
                    className="inline-flex items-center h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold bg-[#eff4ff] text-[#1f5ca9] border border-[#cbdbf5]"
                  >
                    {t('Tầng {0}', [pub.assessedTier || 'A'])}
                  </span>
                  <span
                    data-preview-badge="true"
                    className="inline-flex items-center h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-medium bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]"
                  >
                    {pub.chunkCount} {t('đoạn trích')}
                  </span>
                  {pub.status === 'ACTIVE' && (
                    <span
                      data-testid="publication-status-badge-active"
                      data-preview-badge="true"
                      className="inline-flex items-center gap-1.5 h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{t('Đang phục vụ RAG')}</span>
                    </span>
                  )}
                  {pub.status === 'PENDING' && (
                    <span
                      data-testid="publication-status-badge-pending"
                      data-preview-badge="true"
                      className="inline-flex items-center gap-1.5 h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{t('Chờ hoàn tất')}</span>
                    </span>
                  )}
                  {pub.status === 'SUPERSEDED' && (
                    <span
                      data-testid="publication-status-badge-superseded"
                      data-preview-badge="true"
                      className="inline-flex items-center gap-1.5 h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>{t('Đã thay thế')}</span>
                    </span>
                  )}
                  {pub.status === 'REVOKED' && (
                    <span
                      data-testid="publication-status-badge-revoked"
                      data-preview-badge="true"
                      className="inline-flex items-center gap-1.5 h-6 min-h-[24px] px-2.5 rounded-[6px] text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{t('Đã thu hồi')}</span>
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {pub && (
                <Link
                  to={`/knowledge/sources/${pub.sourceId}`}
                  className="text-[#0072a8] hover:underline hidden sm:flex items-center gap-1 text-sm font-medium"
                >
                  <span>{t('Xem nguồn tri thức')}</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </Link>
              )}
              <button
                type="button"
                data-testid="close-publication-detail-modal-button"
                onClick={onClose}
                title={t('Đóng')}
                aria-label={t('Đóng')}
                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#1e293b] transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Row 2: Sub-info with source title */}
          {pub && (
            <div className="text-xs text-[#64748b]">
              <span className="font-medium text-[#1e293b]">{pub.sourceTitle}</span>
            </div>
          )}

          {/* Row 3: Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-100 -mb-4 sm:-mb-6 pt-1 text-sm overflow-x-auto no-scrollbar">
            <button
              type="button"
              data-testid="detail-tab-jobs"
              onClick={() => setActiveTab('jobs')}
              className={`pb-3 min-h-[44px] font-semibold transition border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'jobs'
                  ? 'text-[#1f5ca9] border-[#1f5ca9]'
                  : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              {t('Tác vụ xử lý (Jobs)')}
            </button>
            <button
              type="button"
              data-testid="detail-tab-manifest"
              onClick={() => setActiveTab('manifest')}
              className={`pb-3 min-h-[44px] font-semibold transition border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'manifest'
                  ? 'text-[#1f5ca9] border-[#1f5ca9]'
                  : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              {t('Nội dung xuất bản')}
            </button>
            <button
              type="button"
              data-testid="detail-tab-events"
              onClick={() => setActiveTab('events')}
              className={`pb-3 min-h-[44px] font-semibold transition border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'events'
                  ? 'text-[#1f5ca9] border-[#1f5ca9]'
                  : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              {t('Lịch sử')}
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#f8f9ff] flex-1 text-sm" data-purpose="modal-body-content">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#1f5ca9] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#64748b]">{t('Đang tải dữ liệu xuất bản...')}</span>
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
              {/* Status Notice Banner */}
              {pub.status === 'PENDING' && (
                <div
                  className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-[#1e293b] flex items-start gap-2.5 leading-relaxed"
                  data-purpose="status-notice-banner"
                >
                  <svg className="w-4 h-4 text-[#1f5ca9] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <div>
                    <strong>{t('Bản này chưa được phục vụ trong RAG.')}</strong>{' '}
                    {t('Việc lập chỉ mục chưa hoàn tất. Kiểm tra lỗi bên dưới trước khi thử lại.')}
                  </div>
                </div>
              )}
              {pub.status === 'ACTIVE' && (
                <div
                  className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs text-[#1e293b] flex items-start gap-2.5 leading-relaxed"
                  data-purpose="status-notice-banner"
                >
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <div>
                    <strong>{t('Bản xuất bản đang hoạt động.')}</strong>{' '}
                    {t('Đang được sử dụng để truy xuất thông tin trong hệ thống RAG.')}
                  </div>
                </div>
              )}

              {/* Tab 1: Jobs */}
              {activeTab === 'jobs' && (
                <section data-purpose="job-details-section" className="space-y-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-semibold text-slate-700">{t('Tác vụ xử lý')}</h3>
                    <span className="text-xs text-[#64748b]">{t('Tác vụ gần nhất được ưu tiên hiển thị')}</span>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#64748b] border border-dashed border-[#e2e8f0] bg-white rounded-xl">
                      {t('Chưa có tác vụ nào được ghi nhận cho bản xuất bản này.')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job, idx) => (
                        <div
                          key={job.id}
                          className={`rounded-xl bg-white p-5 shadow-sm space-y-4 border ${
                            idx === 0
                              ? 'border-2 border-blue-300'
                              : 'border-[#e2e8f0]'
                          }`}
                          data-purpose="index-job-card"
                        >
                          {/* Top Row: Kind, Status, Phase, Claims, Timestamp */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                data-preview-badge="true"
                                className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wide"
                              >
                                {job.kind === 'INDEX' ? t('Lập chỉ mục (INDEX)') : t('Dọn dẹp vector (CLEANUP)')}
                              </span>
                              <span
                                data-preview-badge="true"
                                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-xs border ${
                                  job.status === 'SUCCEEDED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : job.status === 'FAILED'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : job.status === 'WAITING_GATE' || job.status === 'RETRY_WAIT'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-[#1f5ca9] border-blue-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    job.status === 'SUCCEEDED'
                                      ? 'bg-emerald-600'
                                      : job.status === 'FAILED'
                                      ? 'bg-rose-600'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                {job.status === 'FAILED'
                                  ? t('Đã lỗi')
                                  : job.status === 'SUCCEEDED'
                                  ? t('Thành công')
                                  : job.status === 'WAITING_GATE'
                                  ? t('Chờ điều kiện')
                                  : job.status === 'RETRY_WAIT'
                                  ? t('Chờ thử tự động')
                                  : t(job.status)}
                              </span>
                              <span className="text-xs text-slate-300">|</span>
                              <span className="text-xs text-slate-600 font-medium">
                                {t('Giai đoạn')}: {job.phase ? t(job.phase) : job.kind}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span>
                                {t('Lượt nhận xử lý')}:{' '}
                                <strong className="text-slate-800 font-semibold">
                                  {job.claimCount} / {job.maxClaims}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                {t('Cập nhật')}:{' '}
                                <span className="font-mono text-slate-700 font-medium">
                                  {formatDateTime(job.updatedAt)}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Error Message Box if FAILED */}
                          {job.status === 'FAILED' && job.errorCode && (
                            <div
                              className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2.5 leading-relaxed"
                              data-purpose="error-summary-box"
                            >
                              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                              <div>
                                <span className="font-semibold font-mono text-rose-900">
                                  {t('Mã lỗi')}: {job.errorCode}
                                </span>
                                <span> — {t(getJobErrorMessage(job.errorCode))}</span>
                              </div>
                            </div>
                          )}

                          {/* Embedded Run Inspector Box (Accordion) */}
                          <details
                            className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 space-y-3"
                            data-purpose="run-inspector"
                            open={selectedJobId === job.id}
                            onToggle={(e) => {
                              const isOpenNow = (e.target as HTMLDetailsElement).open;
                              if (isOpenNow && selectedJobId !== job.id) {
                                handleSelectJob(job.id);
                              } else if (!isOpenNow && selectedJobId === job.id) {
                                setSelectedJobId(null);
                                selectedJobIdRef.current = null;
                                setSelectedJobDetail(null);
                              }
                            }}
                          >
                            <summary className="cursor-pointer font-semibold text-[#1f5ca9] text-xs min-h-[44px] flex items-center justify-between select-none">
                              <span>{t('Xem lượt chạy của tác vụ này')}</span>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  handleSelectJob(job.id);
                                }}
                                className="text-xs text-[#1f5ca9] font-medium hover:underline cursor-pointer"
                              >
                                {selectedJobId === job.id ? t('Ẩn lượt chạy') : t('Xem lượt chạy (Runs)')}
                              </button>
                            </summary>

                            <div className="mt-3 space-y-3">
                              {loadingJobDetail ? (
                                <div className="py-4 text-center text-xs text-[#64748b]">
                                  {t('Đang tải danh sách lượt chạy...')}
                                </div>
                              ) : selectedJobDetail?.runs?.content && selectedJobDetail.runs.content.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedJobDetail.runs.content.map((run) => {
                                    const isFail = run.status === 'FAILED';
                                    return (
                                      <div
                                        key={run.id}
                                        data-testid={`run-summary-card-${run.id}`}
                                        className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 text-xs"
                                      >
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 tracking-wide">
                                              {t('Kết quả phiên chạy (Run Inspector)')}
                                            </span>
                                            <span
                                              data-testid={`run-status-badge-${run.id}`}
                                              className={`text-[11px] px-2 py-0.5 rounded font-semibold border uppercase ${
                                                isFail
                                                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                              }`}
                                            >
                                              {isFail ? t('Lượt chạy thất bại') : t('Lượt chạy thành công')}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-xs text-slate-500 font-mono flex items-center gap-2 bg-[#f8f9ff] px-3 py-1.5 rounded border border-slate-200/80 flex-wrap">
                                          <span>
                                            {t('Bắt đầu')}: <strong className="text-slate-700">{formatDateTime(run.startedAt)}</strong>
                                          </span>
                                          <span>→</span>
                                          <span>
                                            {t('Kết thúc')}:{' '}
                                            <strong className="text-slate-700">
                                              {run.finishedAt ? formatDateTime(run.finishedAt) : t('Đang chạy')}
                                            </strong>
                                          </span>
                                        </div>

                                        {/* Counts side-by-side (NO percent bar) */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                                          <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs">
                                            <div className="text-xs text-slate-500 mb-1">{t('Điểm dữ liệu dự kiến')}</div>
                                            <div className="text-xl font-bold text-slate-800">{run.expectedPoints}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">expectedPoints</div>
                                          </div>
                                          <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs">
                                            <div className="text-xs text-slate-500 mb-1">{t('Điểm dữ liệu đã xác minh')}</div>
                                            <div className={`text-xl font-bold ${isFail ? 'text-rose-600' : 'text-emerald-600'}`}>
                                              {run.verifiedPoints}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">verifiedPoints</div>
                                          </div>
                                          <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs col-span-2 sm:col-span-1">
                                            <div className="text-xs text-slate-500 mb-1">{t('Hàng rào kiểm soát')}</div>
                                            <div className="text-xl font-bold text-slate-800">{run.fence}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">fence</div>
                                          </div>
                                        </div>

                                        {/* Technical details disclosure */}
                                        <details className="text-xs border-t border-slate-200 pt-2.5 text-slate-600 group">
                                          <summary className="cursor-pointer font-medium text-slate-700 hover:text-[#1f5ca9] flex items-center justify-between select-none list-none min-h-[44px]">
                                            <span className="flex items-center gap-1.5">
                                              <svg className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                              </svg>
                                              <span>{t('Mã và biên nhận kỹ thuật (jobId, runId, receipt)')}</span>
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-mono">{t('Chi tiết ↓')}</span>
                                          </summary>
                                          <div className="mt-2.5 p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
                                            <div>job_id: <span className="text-emerald-400">{job.id}</span></div>
                                            <div>run_id: <span className="text-sky-300">{run.id}</span></div>
                                            <div>fence: <span className="text-amber-400">{run.fence}</span></div>
                                            <div>receiptHash: <span className="text-slate-400">{run.receiptHash || '0x—'}</span></div>
                                          </div>
                                        </details>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-[#64748b] italic py-2">
                                  {t('Chưa có lượt chạy nào được ghi nhận cho tác vụ này.')}
                                </p>
                              )}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Tab 2: Manifest */}
              {activeTab === 'manifest' && manifest && (
                <section data-purpose="manifest-details-section" className="space-y-4">
                  <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
                    <p className="font-bold text-base text-[#1e293b]">
                      {manifest.sourceTitle}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center h-6 px-2.5 rounded-[6px] text-xs font-semibold bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]">
                        {t('Bản {0}', [manifest.revisionNumber])}
                      </span>
                      <span className="inline-flex items-center h-6 px-2.5 rounded-[6px] text-xs font-semibold bg-[#eff4ff] text-[#1f5ca9] border border-[#cbdbf5]">
                        {t('Tầng {0}', [manifest.assessedTier])}
                      </span>
                      <span className="inline-flex items-center h-6 px-2.5 rounded-[6px] text-xs font-medium bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">
                        {manifest.chunks.length} {t('đoạn trích')}
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {manifest.chunks.map((chk) => (
                        <div
                          key={chk.chunkId}
                          className="border border-[#e2e8f0] bg-[#f8f9ff] rounded-lg p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-[#1e293b]">
                              #{chk.position + 1}. {chk.chunkTitle}
                            </h4>
                            <span className="text-xs text-[#64748b] font-mono">
                              {chk.topic} {chk.stage ? `· ${chk.stage}` : ''}
                            </span>
                          </div>
                          <p className="text-[#1e293b] whitespace-pre-line leading-relaxed text-sm">
                            {chk.content}
                          </p>
                          <p className="text-xs text-[#64748b] pt-1 border-t border-[#e2e8f0]">
                            {t('Vị trí')}: <span className="font-mono text-[#1e293b]">{chk.locator}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Fingerprint disclosure */}
                    {fingerprint && (
                      <details className="border-t border-[#e2e8f0] mt-4 pt-2">
                        <summary className="min-h-[44px] flex items-center cursor-pointer text-[#64748b] text-[13px] font-medium hover:text-[#1e293b] select-none">
                          {t('Fingerprint và định danh kỹ thuật')}
                        </summary>
                        <dl className="grid grid-cols-1 sm:grid-cols-[160px_minmax(0,1fr)] gap-2 text-xs font-mono mt-2 p-3 bg-[#f8f9ff] rounded-lg border border-[#e2e8f0]">
                          <dt className="text-slate-500">{t('Model / revision')}</dt>
                          <dd className="text-slate-800 break-all">
                            {fingerprint.embeddingModelId} / {fingerprint.embeddingModelRevision}
                          </dd>
                          <dt className="text-slate-500">{t('Vector')}</dt>
                          <dd className="text-slate-800">
                            {fingerprint.dimension} {t('chiều')} · {fingerprint.distance}
                          </dd>
                          <dt className="text-slate-500">{t('Collection')}</dt>
                          <dd className="text-slate-800 break-all">
                            <code>{fingerprint.collection}</code>
                          </dd>
                          <dt className="text-slate-500">{t('Manifest hash')}</dt>
                          <dd className="text-slate-800 break-all">{pub.manifestHash}</dd>
                          <dt className="text-slate-500">{t('Run được chấp nhận')}</dt>
                          <dd className="text-slate-800">{detail.acceptedIndexRunId || t('Chưa có')}</dd>
                        </dl>
                      </details>
                    )}
                  </div>
                </section>
              )}

              {/* Tab 3: Events */}
              {activeTab === 'events' && (
                <section data-purpose="events-details-section" className="space-y-4">
                  <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
                    <p className="text-xs text-[#64748b]">
                      {t('Hiển thị các sự kiện API đã trả về, không suy diễn đó là toàn bộ lịch sử khi còn trang khác.')}
                    </p>

                    {loadingEvents ? (
                      <div data-testid="events-loading" className="py-6 text-center text-xs text-[#64748b]">
                        {t('Đang tải nhật ký sự kiện...')}
                      </div>
                    ) : eventsError ? (
                      <div
                        data-testid="events-error-banner"
                        className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-base text-red-600 dark:text-red-400"
                          >
                            error
                          </span>
                          <span>{eventsError}</span>
                        </div>
                        <button
                          type="button"
                          data-testid="retry-events-button"
                          onClick={() => loadEvents(publicationId)}
                          className="h-8 min-h-[32px] px-3 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-100 font-semibold cursor-pointer transition-colors shrink-0"
                        >
                          {t('Thử lại')}
                        </button>
                      </div>
                    ) : eventsLoaded && events.length === 0 ? (
                      <div
                        data-testid="events-empty-state"
                        className="p-6 text-center text-xs text-[#64748b] border border-dashed border-[#e2e8f0] rounded-lg"
                      >
                        {t('Chưa có sự kiện nào được ghi nhận.')}
                      </div>
                    ) : (
                      <div className="divide-y divide-[#e2e8f0]">
                        {events.map((evt) => (
                          <div key={evt.id} className="py-3.5 space-y-1.5 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[#1e293b]">
                                {t(evt.action)}
                              </span>
                              <span className="text-xs text-[#64748b] font-mono">
                                {formatShortDate(evt.occurredAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="h-6 px-2.5 rounded-[6px] text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center">
                                {evt.actorKind}{evt.actorUserId ? ` · User #${evt.actorUserId}` : ''}
                              </span>
                              {evt.newStatus && (
                                <span className="text-xs text-[#64748b]">
                                  {t('Trạng thái mới')}: <strong className="text-[#1e293b]">{evt.newStatus}</strong>
                                </span>
                              )}
                            </div>
                            {evt.reason && (
                              <p className="text-xs text-[#1e293b] whitespace-pre-line pt-1 bg-[#f8f9ff] p-2.5 rounded-lg border border-[#e2e8f0]">
                                {evt.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Technical Fingerprint & Head Version Disclosure */}
              <div className="border border-slate-200 rounded-lg bg-white px-4 py-3" data-purpose="head-version-disclosure">
                <details className="text-xs">
                  <summary className="text-sm font-medium text-slate-600 cursor-pointer min-h-[44px] flex items-center select-none">
                    {t('Thông tin kỹ thuật')}
                  </summary>
                  <dl className="mt-3 text-xs grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 font-mono">
                    <dt className="text-slate-500">Head version</dt>
                    <dd className="text-slate-800">{head?.version}</dd>
                    <dt className="text-slate-500">Generation</dt>
                    <dd className="text-slate-800">{head?.generation}</dd>
                    <dt className="text-slate-500">Embedding</dt>
                    <dd className="text-slate-800">
                      {fingerprint?.embeddingModelId} · revision {fingerprint?.embeddingModelRevision}
                    </dd>
                    <dt className="text-slate-500">Vector</dt>
                    <dd className="text-slate-800">
                      {fingerprint?.dimension} {t('chiều')} · {fingerprint?.distance}
                    </dd>
                    <dt className="text-slate-500">Collection</dt>
                    <dd className="text-slate-800 break-all">{fingerprint?.collection}</dd>
                    <dt className="text-slate-500">Manifest hash</dt>
                    <dd className="text-slate-800 break-all">{pub.manifestHash}</dd>
                    <dt className="text-slate-500">Accepted index run</dt>
                    <dd className="text-slate-800">{detail.acceptedIndexRunId || t('Chưa có')}</dd>
                  </dl>
                </details>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer (Fixed at bottom) */}
        <div
          className="px-4 py-3 md:px-6 md:py-4 border-t border-[#e2e8f0] bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-[max(1rem,env(safe-area-inset-bottom))]"
          data-purpose="modal-footer-actions"
        >
          {/* Left: Close button (Hidden on mobile < md, visible on desktop >= md) */}
          <div className="hidden md:block">
            <button
              type="button"
              data-testid="close-publication-detail-footer-button"
              onClick={onClose}
              title={t('Đóng')}
              aria-label={t('Đóng')}
              className="h-11 min-h-[44px] px-5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition cursor-pointer flex items-center justify-center"
            >
              {t('Đóng')}
            </button>
          </div>

          {/* Right Action Group */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 md:gap-3 w-full md:w-auto">
            {canRetryIndex && onRequestRetry && head && pub && (
              <button
                type="button"
                data-testid="detail-retry-index-button"
                onClick={() => onRequestRetry(pub.id, 'INDEX', head, pub.sourceTitle)}
                className="h-11 min-h-[44px] px-6 rounded-lg bg-[#1f5ca9] text-white hover:bg-[#184988] text-sm font-medium shadow-xs flex items-center justify-center gap-2 transition cursor-pointer w-full md:w-auto order-1 md:order-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <span>{t('Thử lập chỉ mục lại')}</span>
              </button>
            )}

            {canRevoke && onRequestRevoke && head && pub && (
              <button
                type="button"
                data-testid="detail-revoke-button"
                onClick={() => onRequestRevoke(pub, head)}
                className="h-11 min-h-[44px] px-5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-sm font-medium transition cursor-pointer flex items-center justify-center w-full md:w-auto order-2 md:order-1"
              >
                {t('Thu hồi')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
