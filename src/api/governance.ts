import client from './client';
import type {
  CreateSourceRequest,
  SaveRevisionRequest,
  SourceResponse,
  RevisionResponse,
  CreatedResponse,
  AuditResponse,
  PageResponse,
  RevisionStatus,
  RevisionSummary,
  AssignmentStatus,
  AssignmentSummary,
  AssignmentDetail,
  ReviewerCandidate,
  AssignReviewerRequest,
  ReassignReviewerRequest,
  DecisionRequest,
  DecisionResponse,
  GovernanceErrorResponse,
} from '../types/governance';
import axios from 'axios';

export interface ParsedGovernanceError {
  status: number;
  error: string;
  code?: string;
  message: string;
  fieldErrors: Record<string, string>;
}

export function parseGovernanceError(err: unknown, fallbackMessage = 'Đã có lỗi xảy ra.'): ParsedGovernanceError {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    const data = err.response.data as Partial<GovernanceErrorResponse> | undefined;
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
      message = 'Bạn không có quyền thực hiện thao tác này.';
    } else if (status === 404) {
      message = data?.message || 'Không tìm thấy hồ sơ nguồn tri thức, phiên bản hoặc nhiệm vụ thẩm định.';
    } else if (status === 409) {
      if (data?.code === 'stale_version') {
        message = 'Hồ sơ đã được cập nhật bởi một thao tác khác. Vui lòng tải lại trang để xem dữ liệu mới nhất.';
      } else if (data?.code === 'active_revision_exists') {
        message = 'Nguồn này đã có một phiên bản đang hoạt động (nháp, đã gửi hoặc đang thẩm định).';
      } else if (data?.code === 'active_assignment_exists') {
        message = 'Phiên bản này đã có chuyên gia đang thẩm định.';
      } else if (data?.code === 'assignment_changed') {
        message = 'Nhiệm vụ phân công đã thay đổi hoặc không còn hiệu lực.';
      } else if (data?.code === 'decision_exists') {
        message = 'Phiên bản này đã có quyết định thẩm định cuối cùng.';
      } else if (data?.code === 'invalid_transition') {
        message = 'Trạng thái hiện tại không cho phép thực hiện thao tác này.';
      } else {
        message = data?.message || 'Hồ sơ đã thay đổi. Vui lòng tải lại và kiểm tra trước khi thực hiện lại.';
      }
    } else if (status === 400 && data?.code === 'invalid_reviewer') {
      message = data?.message || 'Chuyên gia được chọn không hợp lệ hoặc không đủ điều kiện thẩm định.';
    } else if (status === 413) {
      message = data?.message || 'Dữ liệu gửi vượt quá giới hạn cho phép (tối đa 2 MiB).';
    } else if (status === 503) {
      message = data?.message || 'Chức năng tri thức tạm thời chưa sẵn sàng.';
    }

    return {
      status,
      error: data?.error || (status === 403 ? 'forbidden' : status === 409 ? 'conflict' : 'error'),
      code: data?.code,
      message,
      fieldErrors,
    };
  }

  return {
    status: 0,
    error: 'network_error',
    message: err instanceof Error ? err.message : fallbackMessage,
    fieldErrors: {},
  };
}

export async function createSource(
  data: CreateSourceRequest,
  signal?: AbortSignal
): Promise<CreatedResponse> {
  const res = await client.post<CreatedResponse>('/knowledge/sources', data, { signal });
  return res.data;
}

export async function listSources(
  page = 0,
  size = 20,
  status?: RevisionStatus,
  signal?: AbortSignal
): Promise<PageResponse<SourceResponse>> {
  const params: Record<string, string | number> = { page, size };
  if (status) {
    params.status = status;
  }
  const res = await client.get<PageResponse<SourceResponse>>('/knowledge/sources', {
    params,
    signal,
  });
  return res.data;
}

export async function getSource(
  id: string,
  signal?: AbortSignal
): Promise<SourceResponse> {
  const res = await client.get<SourceResponse>(`/knowledge/sources/${id}`, { signal });
  return res.data;
}

export async function getRevision(
  id: string,
  signal?: AbortSignal
): Promise<RevisionResponse> {
  const res = await client.get<RevisionResponse>(`/knowledge/revisions/${id}`, { signal });
  return res.data;
}

export async function saveRevision(
  id: string,
  data: SaveRevisionRequest,
  signal?: AbortSignal
): Promise<RevisionResponse> {
  const res = await client.put<RevisionResponse>(`/knowledge/revisions/${id}`, data, { signal });
  return res.data;
}

export async function getSourceHistory(
  id: string,
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<PageResponse<AuditResponse>> {
  const res = await client.get<PageResponse<AuditResponse>>(`/knowledge/sources/${id}/history`, {
    params: { page, size },
    signal,
  });
  return res.data;
}

// --- 1B-2: Revisions listing, submit, withdraw, and subsequent revision ---

export async function listRevisions(
  sourceId: string,
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<PageResponse<RevisionSummary>> {
  const res = await client.get<PageResponse<RevisionSummary>>(`/knowledge/sources/${sourceId}/revisions`, {
    params: { page, size },
    signal,
  });
  return res.data;
}

export async function submitRevision(
  revisionId: string,
  version: number,
  signal?: AbortSignal
): Promise<RevisionResponse> {
  const res = await client.post<RevisionResponse>(
    `/knowledge/revisions/${revisionId}/submit`,
    { version },
    { signal }
  );
  return res.data;
}

export async function withdrawRevision(
  revisionId: string,
  version: number,
  reason: string,
  signal?: AbortSignal
): Promise<RevisionResponse> {
  const res = await client.post<RevisionResponse>(
    `/knowledge/revisions/${revisionId}/withdraw`,
    { version, reason },
    { signal }
  );
  return res.data;
}

export async function createNextRevision(
  sourceId: string,
  baseRevisionId: string,
  baseVersion: number,
  signal?: AbortSignal
): Promise<RevisionResponse> {
  const res = await client.post<RevisionResponse>(
    `/knowledge/sources/${sourceId}/revisions`,
    { baseRevisionId, baseVersion },
    { signal }
  );
  return res.data;
}

// --- 1B-3: ADMIN Submissions Queue, Reviewer Candidates & Assignment ---

export async function listSubmissions(
  page = 0,
  size = 20,
  status?: RevisionStatus,
  signal?: AbortSignal
): Promise<PageResponse<RevisionSummary>> {
  const params: Record<string, string | number> = { page, size };
  if (status) {
    params.status = status;
  }
  const res = await client.get<PageResponse<RevisionSummary>>('/admin/knowledge/submissions', {
    params,
    signal,
  });
  return res.data;
}

export async function listReviewerCandidates(
  revisionId: string,
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<PageResponse<ReviewerCandidate>> {
  const res = await client.get<PageResponse<ReviewerCandidate>>(
    `/admin/knowledge/revisions/${revisionId}/reviewer-candidates`,
    {
      params: { page, size },
      signal,
    }
  );
  return res.data;
}

export async function assignReviewer(
  revisionId: string,
  data: AssignReviewerRequest,
  signal?: AbortSignal
): Promise<AssignmentDetail> {
  const res = await client.post<AssignmentDetail>(
    `/admin/knowledge/revisions/${revisionId}/assign`,
    data,
    { signal }
  );
  return res.data;
}

export async function reassignReviewer(
  revisionId: string,
  data: ReassignReviewerRequest,
  signal?: AbortSignal
): Promise<AssignmentDetail> {
  const res = await client.post<AssignmentDetail>(
    `/admin/knowledge/revisions/${revisionId}/reassign`,
    data,
    { signal }
  );
  return res.data;
}

// --- 1B-3 & 1B-4: EXPERT Assigned Reviews Queue, Review Snapshot & Decisions ---

export async function listAssignedReviews(
  page = 0,
  size = 20,
  status?: AssignmentStatus,
  signal?: AbortSignal
): Promise<PageResponse<AssignmentSummary>> {
  const params: Record<string, string | number> = { page, size };
  if (status) {
    params.status = status;
  }
  const res = await client.get<PageResponse<AssignmentSummary>>('/knowledge/reviews/assigned', {
    params,
    signal,
  });
  return res.data;
}

export async function getReviewDetail(
  assignmentId: string,
  signal?: AbortSignal
): Promise<AssignmentDetail> {
  const res = await client.get<AssignmentDetail>(`/knowledge/reviews/${assignmentId}`, { signal });
  return res.data;
}

export async function submitDecision(
  assignmentId: string,
  data: DecisionRequest,
  signal?: AbortSignal
): Promise<DecisionResponse> {
  const res = await client.post<DecisionResponse>(
    `/knowledge/reviews/${assignmentId}/decision`,
    data,
    { signal }
  );
  return res.data;
}
