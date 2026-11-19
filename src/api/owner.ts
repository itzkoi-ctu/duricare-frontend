import client from './client';
import type {
  OwnerResponse,
  OwnerPage,
  CreateOwnerRequest,
  UpdateOwnerStatusRequest,
  EventPage,
  OwnerFilterParams,
} from '../types/owner';

export async function listOwners(
  params?: OwnerFilterParams,
  signal?: AbortSignal
): Promise<OwnerPage> {
  const query: Record<string, string | number | boolean> = {};
  if (params?.page !== undefined) query.page = params.page;
  if (params?.size !== undefined) query.size = params.size;
  if (params?.farmId !== undefined && params.farmId !== null) query.farmId = params.farmId;
  if (params?.enabled !== undefined && params.enabled !== null) query.enabled = params.enabled;

  const { data } = await client.get<OwnerPage>('/admin/owners', {
    params: query,
    signal,
  });
  return data;
}

export async function getOwner(id: number, signal?: AbortSignal): Promise<OwnerResponse> {
  const { data } = await client.get<OwnerResponse>(`/admin/owners/${id}`, { signal });
  return data;
}

export async function createOwner(
  request: CreateOwnerRequest,
  signal?: AbortSignal
): Promise<OwnerResponse> {
  const { data } = await client.post<OwnerResponse>('/admin/owners', request, { signal });
  return data;
}

export async function updateOwnerStatus(
  id: number,
  request: UpdateOwnerStatusRequest,
  signal?: AbortSignal
): Promise<OwnerResponse> {
  const { data } = await client.post<OwnerResponse>(`/admin/owners/${id}/status`, request, { signal });
  return data;
}

export async function listOwnerEvents(
  id: number,
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<EventPage> {
  const { data } = await client.get<EventPage>(`/admin/owners/${id}/events`, {
    params: { page, size },
    signal,
  });
  return data;
}
