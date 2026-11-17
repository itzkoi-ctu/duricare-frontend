/**
 * FE-KNOWLEDGE-IMPORT-001 KnowledgeImportPage
 * Top-level page coordinating document upload, preview, chunk editing, unconfirmed sessions recovery, and DRAFT confirm
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import type {
  Capabilities,
  PreviewSession,
  ConfirmReceipt,
  ConfirmRequest,
  Binding,
  FrozenConfirmRecord,
} from '../types/import';
import type { KnowledgeMetadata, SourceType, Topic } from '../types/governance';
import {
  getImportCapabilities,
  deleteImportPreview,
  parseImportError,
} from '../api/import';
import {
  formatBytes,
  formatTimeRemaining,
  generateUUID,
} from '../utils/importUtils';
import ImportUploadStep from '../components/knowledge/import/ImportUploadStep';
import ExtractedTextPanel from '../components/knowledge/import/ExtractedTextPanel';
import ImportChunkEditor, {
  type ChunkEditorState,
  initializeChunksFromProposals,
} from '../components/knowledge/import/ImportChunkEditor';
import ImportConfirmModal from '../components/knowledge/import/ImportConfirmModal';
import ImportSessionsModal from '../components/knowledge/import/ImportSessionsModal';

const DEFAULT_METADATA: KnowledgeMetadata = {
  title: '',
  authors: null,
  publisher: null,
  sourceType: '' as unknown as SourceType,
  year: null,
  edition: null,
  sourceUrl: null,
  evidenceReference: null,
  provenanceNotes: null,
  proposedTier: 'UNKNOWN',
  proposedTierRationale: null,
};

function computeContentSignature(meta: KnowledgeMetadata, chunkStates: ChunkEditorState[]): string {
  return JSON.stringify({
    title: meta.title,
    sourceType: meta.sourceType,
    authors: meta.authors,
    publisher: meta.publisher,
    year: meta.year,
    edition: meta.edition,
    sourceUrl: meta.sourceUrl,
    evidenceReference: meta.evidenceReference,
    provenanceNotes: meta.provenanceNotes,
    chunks: chunkStates.map(c => ({
      title: c.chunk.title,
      topic: c.chunk.topic,
      stage: c.chunk.stage,
      content: c.chunk.content,
      originalExcerpt: c.chunk.originalExcerpt,
      locator: c.chunk.locator,
      applicabilityNotes: c.chunk.applicabilityNotes,
      measurementNotes: c.chunk.measurementNotes,
      locatorStatus: c.locatorStatus,
      selectedSpans: c.selectedSpans,
    })),
  });
}

export default function KnowledgeImportPage() {
  useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useExpertProfile();

  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<PreviewSession | null>(null);
  const [metadata, setMetadata] = useState<KnowledgeMetadata>(DEFAULT_METADATA);
  const [chunks, setChunks] = useState<ChunkEditorState[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Frozen confirm records preserved in memory by importId
  const [frozenConfirmRecords, setFrozenConfirmRecords] = useState<Record<string, FrozenConfirmRecord>>({});

  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [viewTab, setViewTab] = useState<'editor' | 'extraction'>('editor');

  const resumeGenerationRef = useRef<number>(0);

  // Authority & write eligibility enforcement (Fail closed)
  const isAdmin = user?.role === 'ADMIN';
  const isExpert = user?.role === 'EXPERT';
  const isExpertVerified = isExpert && !profileLoading && !profileError && profile?.verificationStatus === 'VERIFIED';
  const isPendingExpert = isExpert && profile?.verificationStatus === 'PENDING';

  // Capabilities readiness (Fail closed: must be loaded, without error, and enabled === true)
  const isCapabilitiesReady = !loadingCapabilities && !capabilitiesError && Boolean(capabilities && capabilities.enabled === true);
  const canWrite = (isAdmin || isExpertVerified) && isCapabilitiesReady;

  const writeDisabledReason = !canWrite
    ? (isPendingExpert
      ? t('Tài khoản chuyên gia đang chờ xác thực (PENDING). Vui lòng chờ quản trị viên duyệt trước khi nhập tài liệu.')
      : !isAdmin && !isExpertVerified
        ? t('Chỉ chuyên gia đã xác thực hoặc Quản trị viên mới có quyền nhập tài liệu.')
        : loadingCapabilities
          ? t('Đang tải cấu hình nhập tài liệu...')
          : capabilitiesError
            ? capabilitiesError
            : capabilities?.enabled === false
              ? t('Tính năng nhập tài liệu hiện đang tạm tắt trên hệ thống')
              : t('Tính năng nhập tài liệu hiện không khả dụng'))
    : null;

  // Load capabilities on mount
  useEffect(() => {
    let mounted = true;
    setLoadingCapabilities(true);
    setCapabilitiesError(null);

    getImportCapabilities()
      .then(cap => {
        if (!mounted) return;
        setCapabilities(cap);
        setLoadingCapabilities(false);
      })
      .catch(err => {
        if (!mounted) return;
        const parsed = parseImportError(err, t('Không thể tải thông số cấu hình nhập tài liệu.'));
        setCapabilitiesError(parsed.message);
        setLoadingCapabilities(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Prevent accidental tab close when editing in memory
  useEffect(() => {
    if (!activeSession) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeSession]);

  const handleUploadSuccess = useCallback((session: PreviewSession) => {
    resumeGenerationRef.current++;
    setActiveSession(session);
    setIsConfirmModalOpen(false);

    // Derive a clean title from filename if no suggestion title
    const rawFileName = session.file.displayName;
    const derivedTitle = session.metadataSuggestion?.title || rawFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    setMetadata({
      ...DEFAULT_METADATA,
      title: derivedTitle,
      sourceType: session.metadataSuggestion?.sourceType || ('' as unknown as SourceType),
      provenanceNotes: t('Nhập tự động từ tệp {0} ({1}). Trình trích xuất: {2}.', [
        session.file.displayName,
        formatBytes(session.file.bytes),
        session.extraction?.parser || 'N/A',
      ]),
    });

    const initialChunks = initializeChunksFromProposals(session.proposals, session.extraction);
    setChunks(initialChunks);
    setReviewConfirmed(false);
    setFieldErrors({});
    setViewTab('editor');
  }, []);

  const handleResumeSession = (session: PreviewSession) => {
    // If the resumed session is CONSUMED and has an existing created source id, navigate directly to it!
    if (session.state === 'CONSUMED' && session.receipt?.created?.source?.id) {
      setIsSessionsModalOpen(false);
      navigate(`/knowledge/sources/${session.receipt.created.source.id}`, {
        state: {
          infoMessage: t('Phiên nhập này đã được xác nhận tạo hồ sơ.'),
        },
      });
      return;
    }

    // Do NOT wipe out frozen records when switching/resuming sessions!
    setIsConfirmModalOpen(false);
    handleUploadSuccess(session);
  };

  const handleProceedToConfirm = () => {
    if (!activeSession) return;
    // Guard against unselected required classifications
    if (!metadata.sourceType || !String(metadata.sourceType).trim()) return;
    if (chunks.some(c => !c.chunk.topic || !String(c.chunk.topic).trim())) return;

    setFieldErrors({});

    const currentSig = computeContentSignature(metadata, chunks);
    const existingRecord = frozenConfirmRecords[activeSession.id];

    // If an existing unresolved record exists (e.g. uncertain outcome from prior attempt)
    // or if the content signature has not changed, reuse the exact frozen record and requestId
    if (existingRecord) {
      if (existingRecord.outcome === 'uncertain') {
        // Idempotent replay: preserve the original importId, requestId, and body until outcome is resolved
        setIsConfirmModalOpen(true);
        return;
      }
      if (
        existingRecord.version === activeSession.version &&
        existingRecord.contentSignature === currentSig
      ) {
        setIsConfirmModalOpen(true);
        return;
      }
    }

    // Otherwise, generate a fresh requestId and freeze new request payload
    const bindings: Binding[] = chunks.map(c => ({
      clientChunkKey: c.chunk.clientChunkKey,
      selectedSpans: c.selectedSpans,
      locatorStatus: c.locatorStatus,
    }));

    const preparedRequest: ConfirmRequest = {
      requestId: generateUUID(),
      version: activeSession.version,
      reviewConfirmed: true,
      metadata: {
        ...metadata,
        sourceType: metadata.sourceType as SourceType,
      },
      chunks: chunks.map(c => ({
        ...c.chunk,
        topic: c.chunk.topic as Topic,
      })),
      bindings,
    };

    const newRecord: FrozenConfirmRecord = {
      importId: activeSession.id,
      version: activeSession.version,
      requestId: preparedRequest.requestId,
      contentSignature: currentSig,
      preparedRequest,
      inFlight: false,
    };

    setFrozenConfirmRecords(prev => ({
      ...prev,
      [activeSession.id]: newRecord,
    }));
    setIsConfirmModalOpen(true);
  };

  const handleRecordOutcome = (
    outcome: 'uncertain' | 'error' | 'success',
    validationErrors?: Record<string, string>
  ) => {
    if (!activeSession) return;
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
    }
    setFrozenConfirmRecords(prev => {
      const cur = prev[activeSession.id];
      if (!cur) return prev;
      return {
        ...prev,
        [activeSession.id]: {
          ...cur,
          outcome,
          inFlight: false,
        },
      };
    });
  };

  const handleCancelSession = async () => {
    if (!activeSession) return;
    if (
      !confirm(
        t('Bạn có chắc chắn muốn hủy phiên làm việc này? Mọi nội dung đang biên tập trong bộ nhớ sẽ bị hủy.')
      )
    ) {
      return;
    }

    setCancellingSession(true);
    try {
      await deleteImportPreview(activeSession.id, activeSession.version);
    } catch (err: unknown) {
      console.warn('Lỗi khi hủy phiên preview phía máy chủ:', err);
    } finally {
      setCancellingSession(false);
      setFrozenConfirmRecords(prev => {
        const next = { ...prev };
        delete next[activeSession.id];
        return next;
      });
      setActiveSession(null);
      setMetadata(DEFAULT_METADATA);
      setChunks([]);
      setReviewConfirmed(false);
    }
  };

  const handleConfirmSuccess = (receipt: ConfirmReceipt) => {
    setIsConfirmModalOpen(false);
    if (activeSession) {
      setFrozenConfirmRecords(prev => {
        const next = { ...prev };
        delete next[activeSession.id];
        return next;
      });
    }
    setActiveSession(null);
    const targetSourceId = receipt.created.source.id;
    navigate(`/knowledge/sources/${targetSourceId}`, {
      state: {
        successMessage: t('Đã nhập và tạo thành công hồ sơ bản nháp từ tài liệu ({0} mảnh tri thức).', [
          receipt.created.revision.chunks.length,
        ]),
      },
    });
  };

  return (
    <div className="space-y-6 max-w-[1216px] w-full mx-auto">
      {/* Top Header & Breadcrumb & Right Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-gray mb-1 select-none">
            <Link to="/knowledge/sources" className="hover:text-navy dark:hover:text-blue transition-colors">
              {t('Nguồn tri thức')}
            </Link>
            <span className="material-symbols-outlined text-[14px] text-gray/60">chevron_right</span>
            <span className="text-text font-medium">{t('Nhập tài liệu')}</span>
            {activeSession && (
              <>
                <span className="material-symbols-outlined text-[14px] text-gray/60">chevron_right</span>
                <span className="text-text font-semibold">{t('Rà soát')}</span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2.5">
              <span className="material-symbols-outlined text-navy dark:text-blue text-2xl">
                {activeSession ? 'rate_review' : 'upload_file'}
              </span>
              {activeSession ? t('Rà soát tài liệu') : t('Nhập tài liệu')}
            </h1>
            {activeSession ? (
              <span
                className="h-[24px] rounded-[6px] text-[12px] px-2.5 py-0.5 bg-blue/10 text-navy dark:bg-blue/20 dark:text-blue border border-blue/30 font-semibold inline-flex items-center whitespace-nowrap shrink-0"
                style={{ height: '24px', minHeight: '24px', borderRadius: '6px', fontSize: '12px', lineHeight: '16px' }}
              >
                {t('Giai đoạn chuẩn bị dữ liệu')}
              </span>
            ) : (
              <p className="text-xs text-gray hidden sm:block">
                {t('Chuyển tài liệu thành bản nháp để rà soát và thẩm định.')}
              </p>
            )}
          </div>
        </div>

        {/* Top Right Action (44px target) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSessionsModalOpen(true)}
            className="h-11 min-h-[44px] px-4 rounded-lg border border-border bg-surface text-text hover:bg-border/30 text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-navy/20 dark:focus:ring-blue/30"
          >
            <span className="material-symbols-outlined text-[18px] text-gray">history</span>
            <span>{t('Phiên nhập của tôi')}</span>
          </button>
        </div>
      </div>

      {/* 3-Stage Progress Stepper */}
      {!activeSession ? (
        <>
          {/* Desktop Stepper */}
          <div className="hidden lg:block bg-surface border border-border rounded-xl px-5 py-3 shadow-xs select-none">
            <div className="flex items-center justify-between text-xs">
              {/* Stage 1 (Active) */}
              <div className="flex items-center gap-2.5 font-semibold text-navy dark:text-blue">
                <span className="w-6 h-6 rounded-full bg-navy dark:bg-blue text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>{t('Tải tài liệu')}</span>
              </div>
              <div className="flex-1 mx-4 h-px bg-border/60" />
              {/* Stage 2 (Pending) */}
              <div className="flex items-center gap-2.5 font-medium text-gray">
                <span className="w-6 h-6 rounded-full bg-border/40 text-gray border border-border flex items-center justify-center text-xs">
                  2
                </span>
                <span>{t('Rà soát nội dung')}</span>
              </div>
              <div className="flex-1 mx-4 h-px bg-border/60" />
              {/* Stage 3 (Pending) */}
              <div className="flex items-center gap-2.5 font-medium text-gray">
                <span className="w-6 h-6 rounded-full bg-border/40 text-gray border border-border flex items-center justify-center text-xs">
                  3
                </span>
                <span>{t('Tạo bản nháp')}</span>
              </div>
            </div>
          </div>

          {/* Mobile Stepper Indicator (matching upload-mobile.html) */}
          <div className="lg:hidden space-y-2 select-none">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue/10 border border-blue/20 text-navy dark:text-blue text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-navy dark:bg-blue"></span>
                <span>{t('Bước 1/3 · Tải tài liệu')}</span>
              </span>
              <span className="text-xs text-gray">{t('Bước 1 / 3')}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="h-1 rounded-full bg-navy dark:bg-blue"></div>
              <div className="h-1 rounded-full bg-border"></div>
              <div className="h-1 rounded-full bg-border"></div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Stepper */}
          <div className="hidden lg:block bg-surface rounded-xl border border-border p-4 shadow-xs select-none">
            <div className="grid grid-cols-3 gap-4">
              {/* Step 1: Completed */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-forest uppercase tracking-wide">
                    {t('Bước 1 · Đã hoàn thành')}
                  </span>
                  <span className="text-sm font-semibold text-text">{t('Tải tài liệu')}</span>
                </div>
              </div>

              {/* Step 2: Active Highlighted */}
              <div className="flex items-center gap-3 bg-blue/10 dark:bg-blue/20 rounded-lg p-2 px-3 border border-blue/30">
                <div className="w-8 h-8 rounded-full bg-navy dark:bg-blue text-white flex items-center justify-center shrink-0 font-bold text-sm">
                  2
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-navy dark:text-blue uppercase tracking-wide">
                    {t('Bước 2 · Đang thực hiện')}
                  </span>
                  <span className="text-sm font-bold text-text">{t('Rà soát nội dung')}</span>
                </div>
              </div>

              {/* Step 3: Pending */}
              <div className="flex items-center gap-3 opacity-60">
                <div className="w-8 h-8 rounded-full bg-border/50 text-gray flex items-center justify-center shrink-0 font-bold text-sm">
                  3
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-gray uppercase tracking-wide">
                    {t('Bước 3 · Chờ xử lý')}
                  </span>
                  <span className="text-sm font-medium text-gray">{t('Tạo bản nháp')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stepper Indicator (matching workspace-mobile.html) */}
          <div className="lg:hidden space-y-2 select-none">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue/10 border border-blue/20 text-navy dark:text-blue text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-navy dark:bg-blue"></span>
                <span>{t('Bước 2/3 · Rà soát tài liệu')}</span>
              </span>
              <span className="text-xs text-gray">{t('Bước 2 / 3')}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="h-1 rounded-full bg-navy dark:bg-blue"></div>
              <div className="h-1 rounded-full bg-navy dark:bg-blue"></div>
              <div className="h-1 rounded-full bg-border"></div>
            </div>
          </div>
        </>
      )}

      {/* Capabilities Loading / Error Banner */}
      {loadingCapabilities && (
        <div className="rounded-xl border border-border bg-surface p-4 text-center text-xs text-gray">
          <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent dark:border-blue dark:border-t-transparent mr-2 align-middle" />
          {t('Đang kiểm tra khả năng hỗ trợ nhập tài liệu...')}
        </div>
      )}

      {capabilitiesError && (
        <div className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-xs text-coral dark:bg-coral/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{capabilitiesError}</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline font-semibold hover:text-coral/80"
          >
            {t('Thử lại')}
          </button>
        </div>
      )}

      {/* Main Flow: STEP 1 Upload vs STEP 2 Workspace */}
      {!activeSession ? (
        <ImportUploadStep
          capabilities={capabilities}
          onUploadSuccess={handleUploadSuccess}
          onOpenSessions={() => setIsSessionsModalOpen(true)}
          canWrite={canWrite}
          disabledReason={writeDisabledReason}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Session Status Bar & Disclosure */}
          <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-start md:items-center justify-between gap-3 flex-wrap">
              {/* File Details & Metadata */}
              <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    activeSession.file.displayName.toLowerCase().endsWith('.pdf')
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                      : 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {activeSession.file.displayName.toLowerCase().endsWith('.pdf')
                      ? 'picture_as_pdf'
                      : 'description'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap min-w-0">
                  <span className="font-bold text-text tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={activeSession.file.displayName}>
                    {activeSession.file.displayName}
                  </span>
                  <span className="text-gray/40">·</span>
                  <span className="text-gray font-mono text-xs tabular-nums">
                    {formatBytes(activeSession.file.bytes)}
                  </span>
                  <span className="text-gray/40">·</span>
                  <span className="text-gray text-xs tabular-nums">
                    {activeSession.extraction?.counters.utf16Units.toLocaleString()} {t('ký tự')}
                  </span>
                  {activeSession.extraction?.counters.pages && activeSession.extraction.counters.pages > 0 && (
                    <>
                      <span className="text-gray/40">·</span>
                      <span className="text-gray text-xs tabular-nums">
                        {activeSession.extraction.counters.pages} {t('trang')}
                      </span>
                    </>
                  )}
                  <span className="text-gray/40">·</span>
                  {/* Amber countdown badge (24px height, 6px radius) */}
                  <span className="h-6 px-2.5 rounded-[6px] text-xs font-medium bg-amber/15 text-amber border border-amber/30 inline-flex items-center gap-1 tabular-nums whitespace-nowrap shrink-0">
                    <span className="material-symbols-outlined text-[13px]">timer</span>
                    {t('Còn')} {formatTimeRemaining(activeSession.expiresAt).text}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Cancel Button (44px touch target) */}
                <button
                  type="button"
                  data-testid="cancel-active-session-button"
                  onClick={handleCancelSession}
                  disabled={cancellingSession}
                  className="h-11 min-h-[44px] px-3.5 rounded-lg border border-coral/30 bg-coral/10 hover:bg-coral/20 text-coral font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                  <span>{t('Hủy phiên')}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Session Technical Details */}
            <details className="group border-t border-border/80 pt-2">
              <summary className="text-xs text-gray hover:text-text cursor-pointer flex items-center gap-1 py-1 select-none">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>{t('Chi tiết phiên kỹ thuật')}</span>
                <span className="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">
                  keyboard_arrow_down
                </span>
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-bg border border-border text-[11px] font-mono text-gray space-y-1">
                <div className="flex justify-between">
                  <span>{t('Mã phiên (Import ID):')}</span>
                  <span className="font-semibold text-text">{activeSession.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Phiên bản (Version):')}</span>
                  <span className="font-semibold text-text">v{activeSession.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Trình bóc tách (Parser):')}</span>
                  <span className="font-semibold text-text">{activeSession.extraction?.parser || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Loại MIME:')}</span>
                  <span className="font-semibold text-text">{activeSession.file.mediaType}</span>
                </div>
              </div>
            </details>
          </div>

          {/* MOBILE SEGMENTED TABS (Biên tập / Văn bản gốc) 44px (matching workspace-mobile.html) */}
          <div className="grid grid-cols-2 gap-1 bg-surface-hover/80 p-1 rounded-lg border border-border lg:hidden select-none">
            <button
              type="button"
              data-testid="mobile-tab-view-editor"
              onClick={() => setViewTab('editor')}
              className={`h-11 min-h-[44px] rounded-md text-[13px] font-semibold flex items-center justify-center gap-1.5 transition ${
                viewTab === 'editor'
                  ? 'bg-surface text-navy dark:text-blue shadow-xs font-bold'
                  : 'text-gray hover:text-text'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>{t('Biên tập')}</span>
            </button>
            <button
              type="button"
              data-testid="mobile-tab-view-extraction"
              onClick={() => setViewTab('extraction')}
              className={`h-11 min-h-[44px] rounded-md text-[13px] font-semibold flex items-center justify-center gap-1.5 transition ${
                viewTab === 'extraction'
                  ? 'bg-surface text-navy dark:text-blue shadow-xs font-bold'
                  : 'text-gray hover:text-text'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">article</span>
              <span>{t('Văn bản gốc')}</span>
            </button>
          </div>

          {/* Main Workspace Grid: 5/12 Left (Raw text) vs 7/12 Right (Editor) */}
          <div className="grid gap-6 lg:grid-cols-12 min-w-0">
            {/* Left / Secondary: Raw Extracted Text Panel */}
            <div
              className={`lg:col-span-5 min-w-0 ${
                viewTab === 'extraction' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="lg:sticky lg:top-4">
                <ExtractedTextPanel
                  file={activeSession.file}
                  extraction={activeSession.extraction}
                />
              </div>
            </div>

            {/* Right / Primary: Metadata & Chunk Editor */}
            <div
              className={`lg:col-span-7 min-w-0 ${
                viewTab === 'editor' ? 'block' : 'hidden lg:block'
              }`}
            >
              <ImportChunkEditor
                metadata={metadata}
                onMetadataChange={setMetadata}
                chunks={chunks}
                onChunksChange={setChunks}
                extraction={activeSession.extraction}
                metadataSuggestion={activeSession.metadataSuggestion}
                reviewConfirmed={reviewConfirmed}
                onReviewConfirmedChange={setReviewConfirmed}
                onProceedToConfirm={handleProceedToConfirm}
                fieldErrors={fieldErrors}
                disabled={!canWrite}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {activeSession && isConfirmModalOpen && frozenConfirmRecords[activeSession.id] && (
        <ImportConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          previewSession={activeSession}
          preparedRequest={frozenConfirmRecords[activeSession.id].preparedRequest}
          metadata={frozenConfirmRecords[activeSession.id].preparedRequest.metadata}
          chunks={chunks}
          onConfirmSuccess={handleConfirmSuccess}
          onRecordOutcome={handleRecordOutcome}
        />
      )}

      {/* Unconfirmed Sessions List Modal */}
      <ImportSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        onResumeSession={handleResumeSession}
      />
    </div>
  );
}
