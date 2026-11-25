import client from './client';
import type { Farm, FarmRequest } from '../types/farm';

export async function getFarms(signal?: AbortSignal): Promise<Farm[]> {
  return (await client.get<Farm[]>('/farms', { signal })).data;
}

export async function getFarm(id: number, signal?: AbortSignal): Promise<Farm> {
  return (await client.get<Farm>(`/farms/${id}`, { signal })).data;
}

export async function updateFarm(id: number, request: FarmRequest, signal?: AbortSignal): Promise<Farm> {
  return (await client.put<Farm>(`/farms/${id}`, request, { signal })).data;
}

export interface CreateFarmResult {
  farm: Farm;
  data: Farm;
  status: number;
  isReplay: boolean;
}

export async function createFarm(
  request: FarmRequest,
  idempotencyKey?: string,
  signal?: AbortSignal
): Promise<CreateFarmResult> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const response = await client.post<Farm>('/farms', request, {
    headers,
    signal,
  });
  return {
    farm: response.data,
    data: response.data,
    status: response.status,
    isReplay: response.status === 200,
  };
}
