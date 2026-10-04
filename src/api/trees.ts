import client from './client';
import type { Tree, UpdateGrowthStageRequest } from '../types/tree';

export async function getTrees(): Promise<Tree[]> {
  return (await client.get<Tree[]>('/trees')).data;
}

export async function getTree(id: number): Promise<Tree> {
  return (await client.get<Tree>(`/trees/${id}`)).data;
}

export async function updateTreeGrowthStage(id: number, request: UpdateGrowthStageRequest): Promise<Tree> {
  return (await client.patch<Tree>(`/trees/${id}/growth-stage`, request)).data;
}
