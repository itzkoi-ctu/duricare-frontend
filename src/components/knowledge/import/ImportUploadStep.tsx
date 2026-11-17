/**
 * FE-KNOWLEDGE-IMPORT-001 ImportUploadStep component
 * Drag-and-drop file upload, client-side pre-validation, truthful upload/extraction progress per Stitch design
 */

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react';
import type { AxiosProgressEvent } from 'axios';
import { t } from '../../../i18n';
import { useLanguage } from '../../../i18n/useLanguage';
import type { Capabilities, PreviewSession } from '../../../types/import';
import { uploadImportFile, parseImportError, type ParsedImportError } from '../../../api/import';
import { formatBytes } from '../../../utils/importUtils';

interface ImportUploadStepProps {
  capabilities: Capabilities | null;
  onUploadSuccess: (session: PreviewSession) => void;
  onOpenSessions: () => void;
  canWrite?: boolean;
  disabledReason?: string | null;
}

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.markdown', '.pdf', '.docx'];

export default function ImportUploadStep({
  capabilities,
  onUploadSuccess,
  onOpenSessions,
  canWrite = true,
  disabledReason = null,
}: ImportUploadStepProps) {
  useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [serverExtracting, setServerExtracting] = useState(false);
  const [serverError, setServerError] = useState<ParsedImportError | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadGenerationRef = useRef<number>(0);

  const isImportDisabled = Boolean(capabilities && capabilities.enabled === false);
  const isWriteBlocked = !canWrite || isImportDisabled;

  // Capabilities limits
  const maxBytes = capabilities?.limits?.fileBytes || 5 * 1024 * 1024;
  const maxPages = capabilities?.limits?.pages || 100;
  const maxChars = capabilities?.limits?.extractedUtf16Units || 120000;
  const maxChunks = capabilities?.limits?.chunks || 20;

  // Cleanup in-flight upload on unmount
  useEffect(() => {
    return () => {
      uploadGenerationRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Countdown timer for 429 Retry-After
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return t('Định dạng tệp "{0}" không được hỗ trợ. Chỉ chấp nhận các định dạng: {1}', [
        ext,
        ALLOWED_EXTENSIONS.join(', '),
      ]);
    }
    if (file.size > maxBytes) {
      return t('Kích thước tệp ({0}) vượt quá giới hạn tối đa cho phép ({1}).', [
        formatBytes(file.size),
        formatBytes(maxBytes),
      ]);
    }
    if (file.size === 0) {
      return t('Tệp được chọn không có nội dung (0 bytes). Vui lòng chọn tệp hợp lệ.');
    }
    return null;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (uploading || isWriteBlocked) return;
    uploadGenerationRef.current++;
    setServerError(null);
    setClientError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const error = validateFile(file);
      if (error) {
        setClientError(error);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading || isWriteBlocked) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading || isWriteBlocked) return;
    uploadGenerationRef.current++;
    setServerError(null);
    setClientError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) {
        setClientError(t('Hệ thống chỉ xử lý một tệp tại một thời điểm. Vui lòng chỉ chọn 1 tệp.'));
        return;
      }
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      if (error) {
        setClientError(error);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile || uploading || isWriteBlocked) return;

    const currentGen = ++uploadGenerationRef.current;
    setUploading(true);
    setUploadPercent(0);
    setServerExtracting(false);
    setServerError(null);
    setClientError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const session = await uploadImportFile(
        selectedFile,
        controller.signal,
        (progressEvent: AxiosProgressEvent) => {
          if (uploadGenerationRef.current !== currentGen) return;
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
            if (percent >= 100) {
              setServerExtracting(true);
            }
          }
        }
      );
      if (uploadGenerationRef.current !== currentGen) return;
      setUploading(false);
      setServerExtracting(false);
      onUploadSuccess(session);
    } catch (err: unknown) {
      if (uploadGenerationRef.current !== currentGen) return;
      setUploading(false);
      setServerExtracting(false);
      const parsed = parseImportError(err, t('Không thể tải lên hoặc xử lý tệp tài liệu.'));
      if (parsed.code === 'request_cancelled') {
        return;
      }
      setServerError(parsed);
      if (parsed.retryAfterSeconds) {
        setRetryCountdown(parsed.retryAfterSeconds);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancelUpload = () => {
    uploadGenerationRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setServerExtracting(false);
    setServerError(null);
    setClientError(t('Đã hủy quá trình tải lên theo yêu cầu của bạn.'));
  };

  const isPdf = selectedFile?.name.toLowerCase().endsWith('.pdf');
  const fileExtLabel = isPdf ? t('Tài liệu PDF (có lớp chữ)') : selectedFile?.name.split('.').pop()?.toUpperCase() || '';

  return (
    <div className="space-y-5" data-testid="import-upload-step">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="file-import-input"
        data-testid="file-import-input"
        accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        disabled={uploading || isWriteBlocked}
        className="hidden"
      />

      {/* Permission / Capability Disabled Warning Banner (Specimen Board C) */}
      {isWriteBlocked && (
        <div
          data-testid="permission-blocked-banner"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-amber-600 shrink-0 mt-0.5">warning</span>
            <div className="text-sm">
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                {disabledReason || (isImportDisabled
                  ? t('Tính năng nhập tài liệu hiện đang tạm tắt trên hệ thống')
                  : t('Quyền nhập tài liệu bị giới hạn'))}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {t('Chỉ Quản trị viên hoặc Chuyên gia đã xác thực mới có quyền tải lên tài liệu mới.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY CARD: UPLOAD DROPZONE / ACTIVE SELECTION */}
      <section className="bg-surface border border-border rounded-xl p-5 md:p-6 shadow-xs space-y-4">
        {/* Format & Capability Header Bar */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-border gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-text">
            <span className="text-gray">{t('Định dạng hỗ trợ:')}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span data-testid="format-badge-txt" className="inline-flex items-center h-6 px-2 rounded-[6px] text-xs font-medium bg-surface-hover text-text border border-border/60 whitespace-nowrap">
                TXT
              </span>
              <span data-testid="format-badge-markdown" className="inline-flex items-center h-6 px-2 rounded-[6px] text-xs font-medium bg-surface-hover text-text border border-border/60 whitespace-nowrap">
                Markdown
              </span>
              <span data-testid="format-badge-pdf" className="inline-flex items-center h-6 px-2 rounded-[6px] text-xs font-medium bg-surface-hover text-text border border-border/60 whitespace-nowrap">
                PDF
              </span>
              <span data-testid="format-badge-docx" className="inline-flex items-center h-6 px-2 rounded-[6px] text-xs font-medium bg-surface-hover text-text border border-border/60 whitespace-nowrap">
                DOCX
              </span>
            </div>
          </div>
          <div className="text-xs text-gray">
            {t('Giới hạn:')} <strong className="font-semibold text-text">1 {t('tệp')}</strong> · {t('Tối đa')}{' '}
            <strong className="font-semibold text-text">{formatBytes(maxBytes)}</strong>
          </div>
        </div>

        {/* DROPZONE: When not currently uploading and no file selected */}
        {!selectedFile && !uploading && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="file-dropzone"
            className={`mt-1 border-2 border-dashed rounded-xl transition-all p-8 md:p-10 flex flex-col items-center justify-center text-center ${
              dragActive
                ? 'border-[#1f5ca9] bg-blue-50/50 dark:bg-blue-950/20 scale-[1.005]'
                : 'border-border bg-surface-hover/30 hover:bg-blue-50/20 hover:border-blue-300'
            } ${isWriteBlocked ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
          >
            {/* Upload Icon */}
            <div className="w-12 h-12 rounded-full bg-blue-100/70 text-[#1f5ca9] dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>

            <h3 className="text-base font-semibold text-text mb-1">
              {t('Kéo thả tài liệu vào đây')}
            </h3>
            <p className="text-xs text-gray mb-4 max-w-md">
              {t('Kéo tệp từ máy tính của bạn vào vùng này, hoặc chọn tệp trực tiếp từ bộ nhớ.')}
            </p>

            {/* Blue Primary Action Button: 44px */}
            <button
              type="button"
              data-testid="file-select-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isWriteBlocked}
              className="h-11 min-h-[44px] px-6 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white font-medium text-sm inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>{t('Chọn tệp')}</span>
            </button>
          </div>
        )}

        {/* SELECTED FILE STATE: When file selected and not currently uploading */}
        {selectedFile && !uploading && (
          <div
            data-testid="selected-file-card"
            className="rounded-xl border border-border bg-surface p-4 md:p-5 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* File Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                    isPdf
                      ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400'
                      : 'bg-blue-50 border-blue-200 text-[#1f5ca9] dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {isPdf ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="selected-file-name"
                      className="text-sm font-semibold text-text truncate block max-w-xs md:max-w-md"
                      title={selectedFile.name}
                    >
                      {selectedFile.name}
                    </span>
                    <span className="inline-flex items-center h-5 px-2 rounded-[6px] text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
                      {t('Sẵn sàng tải lên')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray mt-0.5">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span>·</span>
                    <span>{fileExtLabel}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Height 44px) */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {/* Neutral 44px: Chọn tệp khác */}
                <button
                  type="button"
                  data-testid="change-file-button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 min-h-[44px] px-4 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover font-medium text-xs transition-colors cursor-pointer"
                >
                  {t('Chọn tệp khác')}
                </button>

                {/* Primary 44px: Tải lên và trích xuất */}
                <button
                  type="button"
                  data-testid="start-upload-button"
                  onClick={handleStartUpload}
                  disabled={retryCountdown !== null || isWriteBlocked}
                  className="h-11 min-h-[44px] px-5 rounded-lg bg-[#1f5ca9] hover:bg-[#184988] text-white font-medium text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  <span>
                    {retryCountdown !== null
                      ? t('Thử lại sau {0}s', [retryCountdown])
                      : t('Tải lên và trích xuất')}
                  </span>
                </button>

                {/* 44x44px Icon Remove Target */}
                <button
                  type="button"
                  data-testid="remove-file-button"
                  onClick={() => {
                    uploadGenerationRef.current++;
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-border bg-surface text-gray hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors cursor-pointer"
                  title={t('Gỡ bỏ tệp')}
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UPLOADING & EXTRACTION PROGRESS (Specimen Board A) */}
        {uploading && (
          <div
            data-testid="upload-progress-panel"
            className="rounded-xl border border-border bg-surface p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between text-xs text-text">
              <span className="font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  {serverExtracting ? 'sync' : 'cloud_upload'}
                </span>
                {serverExtracting
                  ? t('Đang trích xuất cấu trúc văn bản... Vui lòng không đóng trình duyệt.')
                  : t('Đang tải tệp lên máy chủ... ({0}%)', [uploadPercent])}
              </span>
              <span className="font-mono text-gray">
                {serverExtracting ? t('Vô định') : `${uploadPercent}%`}
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
              {serverExtracting ? (
                <div
                  data-testid="server-extracting-bar"
                  className="h-full w-full bg-[#1f5ca9] animate-stripes rounded-full"
                />
              ) : (
                <div
                  data-testid="upload-transfer-bar"
                  className="h-full bg-[#1f5ca9] transition-all duration-300 rounded-full"
                  style={{ width: `${uploadPercent}%` }}
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray pt-1">
              <p className="italic">
                {serverExtracting
                  ? t('Thời gian xử lý phụ thuộc vào độ dài và định dạng tệp (PDF thường mất 5–15 giây).')
                  : t('Tiến trình tải lên là tốc độ truyền dẫn thực tế của trình duyệt.')}
              </p>
              <button
                type="button"
                data-testid="cancel-upload-btn"
                onClick={handleCancelUpload}
                className="h-9 min-h-[36px] px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs inline-flex items-center justify-center gap-1 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
                <span>{t('Hủy tải lên')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Operational Notes below Dropzone */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-gray">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-500 text-base shrink-0">info</span>
            <span>{t('PDF cần có lớp văn bản (text-layer); hiện chưa hỗ trợ PDF scan/OCR.')}</span>
          </div>
          <div className="text-[12px] opacity-80">
            {t('Tài liệu chưa được gửi thẩm định hay đưa vào RAG.')}
          </div>
        </div>
      </section>

      {/* COMPACT EXPANDABLE LIMITS & SYSTEM CAPABILITIES */}
      <details
        data-testid="technical-limits-disclosure"
        className="bg-surface border border-border rounded-xl shadow-xs text-xs group transition-all"
      >
        <summary className="min-h-[44px] h-11 px-5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-surface-hover rounded-xl transition-colors">
          <div className="flex items-center gap-2 font-semibold text-text">
            <span className="material-symbols-outlined text-primary text-base">tune</span>
            <span>{t('Giới hạn kỹ thuật và lưu ý xử lý tệp')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray">
            <span className="text-[11px] group-open:hidden">{t('Nhấn để xem chi tiết')}</span>
            <span className="material-symbols-outlined text-base transform group-open:rotate-180 transition-transform">
              expand_more
            </span>
          </div>
        </summary>

        <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-surface-hover/50 rounded-lg border border-border/70">
              <div className="text-[11px] font-medium text-gray uppercase tracking-wider mb-1">
                {t('Dung lượng & Quy mô')}
              </div>
              <div className="text-sm font-semibold text-text">
                {t('Tối đa {0} · {1} trang PDF', [formatBytes(maxBytes), maxPages])}
              </div>
              <p className="text-[11px] text-gray mt-1 leading-4">
                {t('Chỉ nhận 1 tệp mỗi phiên. Tài liệu dài hơn {0} trang cần được cắt trước khi nạp.', [maxPages])}
              </p>
            </div>

            <div className="p-3 bg-surface-hover/50 rounded-lg border border-border/70">
              <div className="text-[11px] font-medium text-gray uppercase tracking-wider mb-1">
                {t('Giới hạn nội dung')}
              </div>
              <div className="text-sm font-semibold text-text">
                {t('{0} ký tự UTF-16 · Tối đa {1} đoạn', [maxChars.toLocaleString(), maxChunks])}
              </div>
              <p className="text-[11px] text-gray mt-1 leading-4">
                {t('Bóc tách nội dung thành tối đa {0} đoạn tri thức độc lập phục vụ rà soát.', [maxChunks])}
              </p>
            </div>

            <div className="p-3 bg-surface-hover/50 rounded-lg border border-border/70">
              <div className="text-[11px] font-medium text-gray uppercase tracking-wider mb-1">
                {t('Quy tắc xử lý tệp')}
              </div>
              <div className="text-sm font-semibold text-text">
                {t('Text Layer · Không OCR')}
              </div>
              <p className="text-[11px] text-gray mt-1 leading-4">
                {t('Phiên xem trước được lưu tạm trên máy chủ. Chưa xác nhận sẽ không tạo hồ sơ DRAFT.')}
              </p>
            </div>
          </div>
        </div>
      </details>

      {/* CLIENT VALIDATION ERROR */}
      {clientError && (
        <div
          data-testid="client-validation-error"
          className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 text-sm flex items-start gap-3"
        >
          <span className="material-symbols-outlined text-xl text-red-600 shrink-0 mt-0.5">error</span>
          <div>
            <p className="font-semibold">{t('Lỗi tệp tài liệu')}</p>
            <p className="mt-0.5 text-xs opacity-95">{clientError}</p>
          </div>
        </div>
      )}

      {/* SERVER ERROR BANNER (Specimen Board B) */}
      {serverError && (
        <div
          data-testid="server-error-banner"
          className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 text-sm space-y-2.5"
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-red-600 shrink-0 mt-0.5">error</span>
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-2">
                <span>{serverError.error} ({serverError.status})</span>
                {serverError.code && (
                  <span className="rounded bg-red-200/60 dark:bg-red-900/60 px-1.5 py-0.5 text-[10px] font-mono font-normal">
                    {serverError.code}
                  </span>
                )}
              </p>
              <p className="text-xs leading-relaxed">{t(serverError.message)}</p>
            </div>
          </div>

          {/* Specific Timeout Recovery (Board G) */}
          {serverError.code === 'request_timeout' && (
            <div className="mt-3 pt-3 border-t border-red-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs text-text">
                {t('Máy chủ có thể vẫn đang xử lý hoặc đã tạo phiên làm việc.')}
              </span>
              <button
                type="button"
                onClick={onOpenSessions}
                className="h-9 min-h-[36px] px-3.5 rounded-lg border border-red-300 bg-surface text-text font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-sm">history</span>
                <span>{t('Kiểm tra Phiên chờ xác nhận')}</span>
              </button>
            </div>
          )}

          {/* Specific PDF No Text / OCR Required Notice */}
          {serverError.code === 'pdf_no_text' && (
            <div className="mt-2 rounded-lg border border-red-300/60 bg-surface p-3 text-xs text-text space-y-1">
              <p className="font-semibold text-red-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                <span>{t('Lưu ý quan trọng về tài liệu PDF dạng quét (Scanned/Image PDF)')}</span>
              </p>
              <p className="text-gray leading-relaxed">
                {t('Hệ thống tuân thủ chính sách bảo mật nội bộ và không tự động gửi tài liệu tới dịch vụ OCR đám mây bên thứ ba. Vui lòng sử dụng phần mềm nhận dạng ký tự quang học (OCR) trên máy để chuyển tệp sang văn bản số trước khi tải lên.')}
              </p>
            </div>
          )}

          {/* Specific Field Errors */}
          {Object.keys(serverError.fieldErrors).length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs space-y-0.5 pl-2 text-text">
              {Object.entries(serverError.fieldErrors).map(([field, msg]) => (
                <li key={field}>
                  <span className="font-semibold">{field}:</span> {String(msg)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
