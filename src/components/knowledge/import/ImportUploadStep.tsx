/**
 * FE-KNOWLEDGE-IMPORT-001 ImportUploadStep component
 * Drag-and-drop file upload, client-side pre-validation, truthful upload/extraction progress
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

  const isImportDisabled = Boolean(capabilities && capabilities.enabled === false);
  const isWriteBlocked = !canWrite || isImportDisabled;

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
    const maxBytes = capabilities?.limits?.fileBytes || 5 * 1024 * 1024;
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
    if (isWriteBlocked) return;
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
    if (isWriteBlocked) return;
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
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
            if (percent >= 100) {
              setServerExtracting(true);
            }
          }
        }
      );
      setUploading(false);
      setServerExtracting(false);
      onUploadSuccess(session);
    } catch (err: unknown) {
      setUploading(false);
      setServerExtracting(false);
      const parsed = parseImportError(err, t('Không thể tải lên hoặc xử lý tệp tài liệu.'));
      setServerError(parsed);
      if (parsed.retryAfterSeconds) {
        setRetryCountdown(parsed.retryAfterSeconds);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploading(false);
      setServerExtracting(false);
      setClientError(t('Đã hủy quá trình tải lên theo yêu cầu của bạn.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Limits Disclosure */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <span className="material-symbols-outlined text-navy dark:text-blue">upload_file</span>
              {t('Nhập tài liệu tri thức tự động')}
            </h2>
            <p className="mt-1 text-sm text-gray">
              {t('Tải lên tài liệu kỹ thuật nông nghiệp để tự động trích xuất nội dung, phân tích vị trí và tạo hồ sơ bản nháp (DRAFT).')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSessions}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3.5 py-2 text-xs font-semibold text-text shadow-sm hover:bg-border/30 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-base text-gray">history</span>
            {t('Phiên nhập chờ xác nhận')}
          </button>
        </div>

        {/* Capabilities details pills */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-bg/50 p-2.5">
            <span className="text-gray block font-medium">{t('Định dạng hỗ trợ')}</span>
            <span className="font-semibold text-text mt-0.5 block">.TXT, .MD, .PDF, .DOCX</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-bg/50 p-2.5">
            <span className="text-gray block font-medium">{t('Dung lượng tối đa')}</span>
            <span className="font-semibold text-text mt-0.5 block">{t('5 MiB (1 tệp)')}</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-bg/50 p-2.5">
            <span className="text-gray block font-medium">{t('Giới hạn PDF & Ký tự')}</span>
            <span className="font-semibold text-text mt-0.5 block">{t('Tối đa 100 trang / 120.000 ký tự')}</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-bg/50 p-2.5">
            <span className="text-gray block font-medium">{t('Lớp văn bản (OCR)')}</span>
            <span className="font-semibold text-coral mt-0.5 block">{t('Chỉ nhận Text Layer (Không OCR)')}</span>
          </div>
        </div>
      </div>

      {/* Permission / Capability Disabled Warning Banner */}
      {isWriteBlocked && (
        <div className="rounded-2xl border border-amber/40 bg-amber/10 p-4 text-amber dark:bg-amber/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">warning</span>
            <div className="text-sm">
              <p className="font-semibold">
                {disabledReason || (isImportDisabled
                  ? t('Tính năng nhập tài liệu hiện đang tạm tắt trên hệ thống')
                  : t('Quyền nhập tài liệu bị giới hạn'))}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {t('Bạn vẫn có thể soạn thảo bản nháp thủ công qua chức năng tạo nguồn tri thức thông thường.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragActive
            ? 'border-navy bg-navy/5 dark:border-blue dark:bg-blue/10 scale-[1.005]'
            : 'border-border/80 bg-card hover:border-gray/50'
        } ${isWriteBlocked ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-import-input"
          accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={uploading || isWriteBlocked}
          className="hidden"
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/10 text-navy dark:bg-blue/20 dark:text-blue">
          <span className="material-symbols-outlined text-3xl">cloud_upload</span>
        </div>

        <h3 className="mt-4 text-base font-semibold text-text">
          {t('Kéo thả tệp tài liệu vào đây hoặc')}{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isWriteBlocked}
            className="text-navy dark:text-blue hover:underline font-bold focus:outline-none disabled:opacity-40"
          >
            {t('chọn từ máy tính')}
          </button>
        </h3>
        <p className="mt-1 text-xs text-gray">
          {t('Hỗ trợ TXT, Markdown, PDF (có lớp text số) và DOCX chuẩn (tối đa 5 MiB)')}
        </p>

        {/* Selected File Details */}
        {selectedFile && !uploading && (
          <div className="mt-6 mx-auto max-w-md rounded-xl border border-border bg-bg p-3.5 text-left flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-2xl text-navy dark:text-blue shrink-0">
                description
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-gray hover:text-coral p-1 rounded-lg hover:bg-border/40 transition-colors"
              title={t('Bỏ chọn tệp')}
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Upload & Extraction Progress */}
        {uploading && (
          <div className="mt-6 mx-auto max-w-md space-y-3">
            <div className="flex items-center justify-between text-xs text-gray">
              <span>
                {serverExtracting
                  ? t('Đang trích xuất và phân tích cấu trúc trên máy chủ...')
                  : `${t('Đang tải lên')} (${uploadPercent}%)...`}
              </span>
              <span>{serverExtracting ? t('Vui lòng chờ...') : `${uploadPercent}%`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full transition-all duration-300 ${
                  serverExtracting ? 'bg-amber animate-pulse w-full' : 'bg-navy dark:bg-blue'
                }`}
                style={{ width: serverExtracting ? '100%' : `${uploadPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray/80 italic">
              {serverExtracting
                ? t('Tiến trình máy chủ đang kiểm tra an toàn, định chuẩn UTF-8 và tạo phân đoạn.')
                : t('Tiến trình tải lên là tốc độ truyền dẫn của trình duyệt.')}
            </p>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="mt-2 text-xs text-coral hover:underline font-semibold"
            >
              {t('Hủy tải lên')}
            </button>
          </div>
        )}

        {/* Action Button */}
        {selectedFile && !uploading && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={retryCountdown !== null || isWriteBlocked}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-navy/90 transition-all focus:outline-none focus:ring-2 focus:ring-navy/40 dark:bg-blue dark:text-bg dark:hover:bg-blue/90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              {retryCountdown !== null
                ? t('Thử lại sau {0}s', [retryCountdown])
                : `${t('Bắt đầu trích xuất')} ${t('và xem trước')}`}
            </button>
          </div>
        )}
      </div>

      {/* Client validation error */}
      {clientError && (
        <div className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-coral dark:bg-coral/20 text-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">error</span>
          <div>
            <p className="font-semibold">{t('Lỗi tệp tài liệu')}</p>
            <p className="mt-0.5 text-xs opacity-95">{clientError}</p>
          </div>
        </div>
      )}

      {/* Server error banner */}
      {serverError && (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-4 text-coral dark:bg-coral/20 text-sm space-y-2">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">error</span>
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-2">
                <span>{serverError.error} ({serverError.status})</span>
                {serverError.code && (
                  <span className="rounded bg-coral/20 px-1.5 py-0.5 text-[10px] font-mono font-normal">
                    {serverError.code}
                  </span>
                )}
              </p>
              <p className="text-xs leading-relaxed">{serverError.message}</p>
            </div>
          </div>

          {/* Specific OCR Required Notice */}
          {serverError.code === 'pdf_no_text' && (
            <div className="mt-2 rounded-xl border border-coral/30 bg-bg p-3 text-xs text-text">
              <p className="font-semibold text-coral flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                {t('Lưu ý quan trọng về tài liệu PDF dạng quét (Scanned/Image PDF)')}
              </p>
              <p className="mt-1 text-gray leading-relaxed">
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
