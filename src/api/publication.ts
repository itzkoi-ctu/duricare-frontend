import client from './client';
import axios from 'axios';
import type {
  PublicationHead,
  PublishRequest,
  RetryRequest,
  RevokeRequest,
  PagePublicationSummary,
  PublicationDetail,
  PageJobSummary,
  JobDetail,
  MutationReceipt,
  OperationReceipt,
  PagePublicationEvent,
  PublicationStatus,
  JobKind,
  JobStatus,
  PublicationError,
} from '../types/publication';

export interface ParsedPublicationError {
  status: number;
  error: string;
  code?: string;
  message: string;
  fieldErrors: Record<string, string>;
}

export function parsePublicationError(err: unknown, fallbackMessage = 'Đã có lỗi xảy ra.'): ParsedPublicationError {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    const data = err.response.data as Partial<PublicationError> | undefined;
    const fieldErrors: Record<string, string> = {};
    if (data?.fieldErrors && Array.isArray(data.fieldErrors)) {
      for (const fe of data.fieldErrors) {
        if (fe.field && fe.message) {
          fieldErrors[fe.field] = fe.message;
        }
      }
    }

    let message = data?.message || fallbackMessage;
    if (status === 403) {
      message = 'Bạn không có quyền quản trị để thực hiện thao tác xuất bản này.';
    } else if (status === 404) {
      message = data?.message || 'Không tìm thấy hồ sơ xuất bản, tác vụ hoặc biên nhận thao tác.';
    } else if (status === 409) {
      if (data?.code === 'stale_version') {
        message = 'Phiên bản xuất bản đã thay đổi. Vui lòng làm mới dữ liệu và thử lại.';
      } else if (data?.code === 'idempotency_key_reused') {
        message = 'Mã yêu cầu (requestId) đã được sử dụng cho một thao tác khác.';
      } else if (data?.code === 'already_active') {
        message = 'Phiên bản này đã được xuất bản và đang hoạt động trong hệ thống RAG.';
      } else if (data?.code === 'pending_publication_exists') {
        message = 'Nguồn này đã có một yêu cầu xuất bản đang được xử lý (PENDING). Vui lòng đợi hoàn tất hoặc thu hồi.';
      } else if (data?.code === 'invalid_state') {
        message = 'Trạng thái bản xuất bản không hợp lệ để thực hiện thao tác này.';
      } else if (data?.code === 'live_job_exists') {
        message = 'Đang có tác vụ đang chạy trên bản xuất bản này.';
      } else if (data?.code === 'already_revoked') {
        message = 'Bản xuất bản này đã được thu hồi trước đó.';
      } else if (data?.code === 'fingerprint_changed') {
        message = 'Cấu hình vector fingerprint đã thay đổi.';
      } else {
        message = data?.message || 'Trạng thái đã thay đổi. Vui lòng tải lại và xác nhận lại.';
      }
    } else if (status === 400) {
      if (data?.code === 'publication_ineligible') {
        message = data?.message || 'Hồ sơ không đủ điều kiện xuất bản (chỉ hỗ trợ phiên bản APPROVED mới nhất và đạt chuẩn DURI-1B-v1).';
      } else if (data?.code === 'invalid_page') {
        message = data?.message || 'Thông số phân trang không hợp lệ.';
      } else {
        message = data?.message || 'Thông tin yêu cầu xuất bản không hợp lệ.';
      }
    } else if (status === 413) {
      message = data?.message || 'Dữ liệu gửi vượt quá giới hạn (16 KiB).';
    } else if (status === 503) {
      if (data?.code === 'publication_disabled') {
        message = 'Chức năng xuất bản hiện đang tạm dừng trong hệ thống.';
      } else if (data?.code === 'publication_schema_not_ready') {
        message = 'Cơ sở dữ liệu xuất bản chưa hoàn tất cấu trúc.';
      } else {
        message = data?.message || 'Chức năng xuất bản hiện chưa sẵn sàng.';
      }
    } else if (status === 500) {
      message = data?.message || 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.';
    }

    return {
      status,
      error: data?.error || 'error',
      code: data?.code,
      message,
      fieldErrors,
    };
  }

  if (err instanceof Error) {
    return {
      status: 0,
      error: 'network_error',
      message: err.message || fallbackMessage,
      fieldErrors: {},
    };
  }

  return {
    status: 0,
    error: 'unknown',
    message: fallbackMessage,
    fieldErrors: {},
  };
}

/**
 * GET /api/admin/knowledge/sources/{sourceId}/publication-head
 * Retrieves publication head for a given knowledge source.
 * Returns virtual v0 if source exists but has no head.
 */
export async function getPublicationHead(sourceId: string, signal?: AbortSignal): Promise<PublicationHead> {
  const res = await client.get<PublicationHead>(`/admin/knowledge/sources/${encodeURIComponent(sourceId)}/publication-head`, {
    signal,
  });
  return res.data;
}

/**
 * POST /api/admin/knowledge/sources/{sourceId}/publications
 * Requests publication of an approved revision.
 * Returns 202 Accepted with MutationReceipt.
 */
export async function publishRevision(
  sourceId: string,
  body: PublishRequest,
  signal?: AbortSignal
): Promise<MutationReceipt> {
  const res = await client.post<MutationReceipt>(
    `/admin/knowledge/sources/${encodeURIComponent(sourceId)}/publications`,
    body,
    { signal }
  );
  return res.data;
}

/**
 * GET /api/admin/knowledge/publications
 * Lists publications with pagination and optional filters.
 */
export async function listPublications(
  params?: {
    page?: number;
    size?: number;
    sourceId?: string;
    status?: PublicationStatus;
  },
  signal?: AbortSignal
): Promise<PagePublicationSummary> {
  const res = await client.get<PagePublicationSummary>('/admin/knowledge/publications', {
    params,
    signal,
  });
  return res.data;
}

/**
 * GET /api/admin/knowledge/publications/{publicationId}
 * Retrieves full details of a publication including head, summary, manifest, fingerprint, and jobs.
 */
export async function getPublicationDetail(
  publicationId: string,
  signal?: AbortSignal
): Promise<PublicationDetail> {
  const res = await client.get<PublicationDetail>(`/admin/knowledge/publications/${encodeURIComponent(publicationId)}`, {
    signal,
  });
  return res.data;
}

/**
 * POST /api/admin/knowledge/publications/{publicationId}/retry
 * Requests retry for a FAILED index job on a PENDING publication.
 * Returns 202 Accepted with MutationReceipt.
 */
export async function retryPublication(
  publicationId: string,
  body: RetryRequest,
  signal?: AbortSignal
): Promise<MutationReceipt> {
  const res = await client.post<MutationReceipt>(
    `/admin/knowledge/publications/${encodeURIComponent(publicationId)}/retry`,
    body,
    { signal }
  );
  return res.data;
}

/**
 * POST /api/admin/knowledge/publications/{publicationId}/revoke
 * Revokes an active or pending publication.
 * Returns 200 OK with MutationReceipt.
 */
export async function revokePublication(
  publicationId: string,
  body: RevokeRequest,
  signal?: AbortSignal
): Promise<MutationReceipt> {
  const res = await client.post<MutationReceipt>(
    `/admin/knowledge/publications/${encodeURIComponent(publicationId)}/revoke`,
    body,
    { signal }
  );
  return res.data;
}

/**
 * GET /api/admin/knowledge/publications/{publicationId}/jobs
 * Lists jobs for a publication.
 */
export async function listPublicationJobs(
  publicationId: string,
  params?: {
    page?: number;
    size?: number;
    kind?: JobKind;
    status?: JobStatus;
  },
  signal?: AbortSignal
): Promise<PageJobSummary> {
  const res = await client.get<PageJobSummary>(
    `/admin/knowledge/publications/${encodeURIComponent(publicationId)}/jobs`,
    {
      params,
      signal,
    }
  );
  return res.data;
}

/**
 * GET /api/admin/knowledge/publication-jobs/{jobId}
 * Retrieves detail of a specific job and its execution runs.
 */
export async function getJobDetail(
  jobId: string,
  params?: {
    runPage?: number;
    runSize?: number;
  },
  signal?: AbortSignal
): Promise<JobDetail> {
  const res = await client.get<JobDetail>(
    `/admin/knowledge/publication-jobs/${encodeURIComponent(jobId)}`,
    {
      params,
      signal,
    }
  );
  return res.data;
}

/**
 * POST /api/admin/knowledge/publication-jobs/{jobId}/retry-cleanup
 * Requests retry for a failed CLEANUP job.
 * Returns 202 Accepted with MutationReceipt.
 */
export async function retryCleanupJob(
  jobId: string,
  body: RetryRequest,
  signal?: AbortSignal
): Promise<MutationReceipt> {
  const res = await client.post<MutationReceipt>(
    `/admin/knowledge/publication-jobs/${encodeURIComponent(jobId)}/retry-cleanup`,
    body,
    { signal }
  );
  return res.data;
}

/**
 * GET /api/admin/knowledge/publications/{publicationId}/events
 * Lists append-only audit events of a publication.
 */
export async function listPublicationEvents(
  publicationId: string,
  params?: {
    page?: number;
    size?: number;
  },
  signal?: AbortSignal
): Promise<PagePublicationEvent> {
  const res = await client.get<PagePublicationEvent>(
    `/admin/knowledge/publications/${encodeURIComponent(publicationId)}/events`,
    {
      params,
      signal,
    }
  );
  return res.data;
}

/**
 * GET /api/admin/knowledge/publication-operations/{requestId}
 * Retrieves receipt of an operation previously performed by the current authenticated admin.
 */
export async function getOperationReceipt(
  requestId: string,
  signal?: AbortSignal
): Promise<OperationReceipt> {
  const res = await client.get<OperationReceipt>(
    `/admin/knowledge/publication-operations/${encodeURIComponent(requestId)}`,
    { signal }
  );
  return res.data;
}
