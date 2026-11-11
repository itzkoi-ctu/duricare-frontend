/**
 * FE-KNOWLEDGE-IMPORT-001 API client according to frozen contract & openapi.json
 * Revision: C0-v2-P1-2026-11-09
 * Aggregate SHA-256: f7f91ddbedd2dcf24dc31de3712c6ef951fa5442b3a71bbb25973ec075a3f6a8
 */

import client from './client';
import axios, { type AxiosProgressEvent } from 'axios';
import type {
  Capabilities,
  PreviewSession,
  SessionPage,
  ConfirmRequest,
  ConfirmReceipt,
  ProvenanceView,
  ImportError,
} from '../types/import';

export interface ParsedImportError {
  status: number;
  error: string;
  code?: string;
  message: string;
  fieldErrors: Record<string, string>;
  retryAfterSeconds?: number;
}

export function parseImportError(err: unknown, fallbackMessage = 'Đã có lỗi xảy ra.'): ParsedImportError {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    const data = err.response.data as Partial<ImportError> | undefined;
    const fieldErrors: Record<string, string> = {};

    if (data?.fieldErrors && Array.isArray(data.fieldErrors)) {
      for (const fe of data.fieldErrors) {
        if (fe.field && fe.message) {
          fieldErrors[fe.field] = fe.message;
        }
      }
    }

    let retryAfterSeconds: number | undefined;
    const retryHeader = err.response.headers?.['retry-after'];
    if (retryHeader) {
      const parsed = parseInt(String(retryHeader), 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfterSeconds = parsed;
      }
    }

    let message = data?.message || fallbackMessage;

    if (status === 401) {
      message = 'Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.';
    } else if (status === 403) {
      message = 'Bạn không có quyền thực hiện thao tác nhập tài liệu này (chỉ dành cho ADMIN hoặc Chuyên gia đã xác thực).';
    } else if (status === 404) {
      message = data?.message || 'Không tìm thấy phiên nhập tài liệu hoặc hồ sơ nguồn tri thức yêu cầu.';
    } else if (status === 409) {
      if (data?.code === 'stale_version') {
        message = 'Phiên bản phiên nhập đã thay đổi hoặc đã bị sửa đổi. Vui lòng làm mới trang.';
      } else if (data?.code === 'import_consumed') {
        message = 'Phiên nhập này đã được xác nhận tạo DRAFT trước đó và không thể sửa lại.';
      } else if (data?.code === 'idempotency_conflict') {
        message = 'Mã yêu cầu (requestId) đã được sử dụng với nội dung khác. Vui lòng gửi lại yêu cầu gốc.';
      } else if (data?.code === 'invalid_transition') {
        message = 'Trạng thái phiên làm việc không hợp lệ để thực hiện thao tác này.';
      }
    } else if (status === 410) {
      message = 'Phiên nhập tài liệu tạm thời đã hết hạn (TTL 30 phút). Vui lòng tải lên lại tài liệu.';
    } else if (status === 413) {
      if (data?.code === 'file_too_large') {
        message = 'Tệp tài liệu vượt quá dung lượng tối đa cho phép (5 MiB).';
      } else if (data?.code === 'extracted_text_limit') {
        message = 'Văn bản trích xuất vượt quá giới hạn tối đa (120.000 ký tự UTF-16).';
      } else if (data?.code === 'page_limit') {
        message = 'Tệp PDF vượt quá giới hạn tối đa 100 trang.';
      } else if (data?.code === 'segment_limit') {
        message = 'Tài liệu vượt quá giới hạn 2.000 đoạn cấu trúc.';
      } else if (data?.code === 'docx_expansion_limit') {
        message = 'Tệp DOCX nén vượt quá tỷ lệ giải nén an toàn.';
      } else {
        message = data?.message || 'Nội dung tải lên vượt quá giới hạn kích thước cho phép.';
      }
    } else if (status === 415) {
      if (data?.code === 'unsupported_format') {
        message = 'Định dạng tệp không được hỗ trợ. Hệ thống chỉ hỗ trợ .txt, .md, .markdown, .pdf và .docx.';
      } else if (data?.code === 'unsupported_docx_profile') {
        message = 'Định dạng tệp DOCX chứa các thành phần cấu trúc chưa được hỗ trợ (ví dụ: macro-enabled).';
      } else {
        message = data?.message || 'Định dạng tệp không tương thích.';
      }
    } else if (status === 422) {
      if (data?.code === 'pdf_no_text') {
        message = 'Tệp PDF không chứa lớp văn bản trích xuất được (có thể là tài liệu quét/ảnh). Hệ thống không tự động chạy OCR.';
      } else if (data?.code === 'pdf_corrupt') {
        message = 'Tệp PDF bị hỏng hoặc cấu trúc không hợp lệ.';
      } else if (data?.code === 'pdf_encrypted') {
        message = 'Tệp PDF đã được mã hóa hoặc yêu cầu mật khẩu mở.';
      } else if (data?.code === 'docx_corrupt') {
        message = 'Tệp DOCX bị hỏng hoặc cấu trúc gói ZIP không hợp lệ.';
      } else if (data?.code === 'unsafe_document') {
        message = 'Tài liệu bị từ chối do vi phạm quy tắc an toàn trích xuất.';
      } else if (data?.code === 'extraction_timeout') {
        message = 'Quá thời gian xử lý trích xuất văn bản từ tài liệu.';
      } else if (data?.code === 'no_extractable_text') {
        message = 'Không tìm thấy nội dung văn bản trích xuất được trong tài liệu.';
      } else {
        message = data?.message || 'Không thể xử lý nội dung tài liệu tải lên.';
      }
    } else if (status === 429) {
      const waitMsg = retryAfterSeconds ? ` Vui lòng thử lại sau ${retryAfterSeconds} giây.` : ' Vui lòng thử lại sau giây lát.';
      message = (data?.message || 'Hệ thống đang bận xử lý nhiều phiên nhập cùng lúc.') + waitMsg;
    } else if (status === 503) {
      if (data?.code === 'import_disabled') {
        message = 'Tính năng nhập tài liệu tự động hiện đang tạm tắt trên hệ thống.';
      } else {
        message = data?.message || 'Dịch vụ xử lý tài liệu tạm thời không khả dụng. Vui lòng thử lại sau.';
      }
    }

    return {
      status,
      error: data?.error || (status >= 500 ? 'Server Error' : 'Request Error'),
      code: data?.code,
      message,
      fieldErrors,
      retryAfterSeconds,
    };
  }

  if (err instanceof Error) {
    if (err.name === 'CanceledError' || err.message === 'canceled') {
      return {
        status: 0,
        error: 'Canceled',
        message: 'Thao tác đã bị hủy bởi người dùng.',
        fieldErrors: {},
      };
    }
    return {
      status: 0,
      error: err.name,
      message: err.message || fallbackMessage,
      fieldErrors: {},
    };
  }

  return {
    status: 0,
    error: 'Unknown Error',
    message: fallbackMessage,
    fieldErrors: {},
  };
}

/**
 * 1. GET /knowledge/imports/capabilities
 */
export async function getImportCapabilities(signal?: AbortSignal): Promise<Capabilities> {
  const res = await client.get<Capabilities>('/knowledge/imports/capabilities', { signal });
  return res.data;
}

/**
 * 2. POST /knowledge/imports (multipart file upload)
 */
export async function uploadImportFile(
  file: File,
  signal?: AbortSignal,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<PreviewSession> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await client.post<PreviewSession>('/knowledge/imports', formData, {
    signal,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return res.data;
}

/**
 * 3. GET /knowledge/imports (list own preview sessions)
 */
export async function listImportPreviews(
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<SessionPage> {
  const res = await client.get<SessionPage>('/knowledge/imports', {
    params: { page, size },
    signal,
  });
  return res.data;
}

/**
 * 4. GET /knowledge/imports/{id} (get own preview session)
 */
export async function getImportPreview(
  id: string,
  signal?: AbortSignal
): Promise<PreviewSession> {
  const res = await client.get<PreviewSession>(`/knowledge/imports/${id}`, { signal });
  return res.data;
}

/**
 * 5. DELETE /knowledge/imports/{id}?version={version} (cancel own preview session)
 */
export async function deleteImportPreview(
  id: string,
  version: number,
  signal?: AbortSignal
): Promise<void> {
  await client.delete(`/knowledge/imports/${id}`, {
    params: { version },
    signal,
  });
}

/**
 * 6. POST /knowledge/imports/{id}/confirm (confirm preview into Knowledge DRAFT)
 */
export async function confirmImportDraft(
  id: string,
  request: ConfirmRequest,
  signal?: AbortSignal
): Promise<ConfirmReceipt> {
  const res = await client.post<ConfirmReceipt>(`/knowledge/imports/${id}/confirm`, request, { signal });
  return res.data;
}

/**
 * 7. GET /knowledge/revisions/{id}/import-provenance (view document provenance)
 */
export async function getRevisionProvenance(
  revisionId: string,
  signal?: AbortSignal
): Promise<ProvenanceView> {
  const res = await client.get<ProvenanceView>(`/knowledge/revisions/${revisionId}/import-provenance`, { signal });
  return res.data;
}
