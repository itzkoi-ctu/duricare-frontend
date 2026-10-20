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
      message = data?.message || 'Không tìm thấy hồ sơ nguồn tri thức hoặc phiên bản.';
    } else if (status === 409) {
      message = data?.message || 'Hồ sơ đã thay đổi. Vui lòng tải lại và kiểm tra trước khi thực hiện lại.';
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
