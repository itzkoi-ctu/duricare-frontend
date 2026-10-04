import client from './client';
import type { Farm, FarmRequest } from '../types/farm';

export async function getFarms(): Promise<Farm[]> {
  return (await client.get<Farm[]>('/farms')).data;
}

export async function getFarm(id: number): Promise<Farm> {
  return (await client.get<Farm>(`/farms/${id}`)).data;
}

export async function updateFarm(id: number, request: FarmRequest): Promise<Farm> {
  return (await client.put<Farm>(`/farms/${id}`, request)).data;
}
