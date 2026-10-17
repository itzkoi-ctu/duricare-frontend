import client from './client';
import type {
  ExpertProfile,
  ExpertProfilePage,
  CreateExpertRequest,
  TransitionExpertRequest,
} from '../types/expert';

export async function getOwnExpertProfile(signal?: AbortSignal): Promise<ExpertProfile | null> {
  const { data } = await client.get<ExpertProfile | null>('/expert/profile', { signal });
  return data;
}

export async function getExperts(
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<ExpertProfilePage> {
  const { data } = await client.get<ExpertProfilePage>('/admin/experts', {
    params: { page, size },
    signal,
  });
  return data;
}

export async function getExpert(id: number, signal?: AbortSignal): Promise<ExpertProfile> {
  const { data } = await client.get<ExpertProfile>(`/admin/experts/${id}`, { signal });
  return data;
}

export async function createExpert(request: CreateExpertRequest): Promise<ExpertProfile> {
  const { data } = await client.post<ExpertProfile>('/admin/experts', request);
  return data;
}

export async function verifyExpert(
  id: number,
  request: TransitionExpertRequest
): Promise<ExpertProfile> {
  const { data } = await client.post<ExpertProfile>(`/admin/experts/${id}/verify`, request);
  return data;
}

export async function suspendExpert(
  id: number,
  request: TransitionExpertRequest
): Promise<ExpertProfile> {
  const { data } = await client.post<ExpertProfile>(`/admin/experts/${id}/suspend`, request);
  return data;
}
