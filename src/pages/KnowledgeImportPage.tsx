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
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray mb-1">
            <Link to="/knowledge/sources" className="hover:text-text transition-colors">
              {t('Nguồn tri thức')}
            </Link>
            <span>/</span>
            <span className="text-text font-semibold">{t('Nhập tài liệu tự động')}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-text flex items-center gap-2">
            <span className="material-symbols-outlined text-navy dark:text-blue text-2xl">
              upload_file
            </span>
            {t('Nhập tài liệu tri thức (Document Import)')}
          </h1>
        </div>

        {/* Header Right Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSessionsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text shadow-sm hover:bg-border/30 transition-colors"
          >
            <span className="material-symbols-outlined text-base text-gray">history</span>
            {t('Phiên chờ xác nhận')}
          </button>
        </div>
      </div>

      {/* Capabilities Loading / Error Banner */}
      {loadingCapabilities && (
        <div className="rounded-xl border border-border bg-card p-4 text-center text-xs text-gray">
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
          {/* Active Session Status Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-2xl text-navy dark:text-blue shrink-0">
                description
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-text truncate max-w-md">
                    {activeSession.file.displayName}
                  </p>
                  <span className="rounded-full bg-navy/15 text-navy dark:bg-blue/20 dark:text-blue px-2 py-0.5 text-[10px] font-bold">
                    v{activeSession.version}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray">
                  <span>{formatBytes(activeSession.file.bytes)}</span>
                  <span>•</span>
                  <span>
                    {activeSession.extraction?.counters.utf16Units.toLocaleString()} {t('ký tự')}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-amber">
                    {t('Hết hạn sau:')} {formatTimeRemaining(activeSession.expiresAt).text}
                  </span>
                </div>
              </div>
            </div>

            {/* View Mode Toggle (Mobile / Tablet) & Cancel */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center rounded-xl bg-bg p-1 border border-border lg:hidden">
                <button
                  type="button"
                  onClick={() => setViewTab('editor')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    viewTab === 'editor'
                      ? 'bg-card text-text shadow-sm'
                      : 'text-gray hover:text-text'
                  }`}
                >
                  {t('Biên tập mảnh')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('extraction')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    viewTab === 'extraction'
                      ? 'bg-card text-text shadow-sm'
                      : 'text-gray hover:text-text'
                  }`}
                >
                  {t('Xem văn bản gốc')}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCancelSession}
                disabled={cancellingSession}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-coral hover:bg-coral/10 hover:border-coral/40 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                {t('Hủy phiên')}
              </button>
            </div>
          </div>

          {/* Main Workspace Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left / Secondary: Raw Extracted Text Panel */}
            <div
              className={`lg:col-span-5 ${
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
              className={`lg:col-span-7 ${
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
