import client from './client';
import type { OverviewResponse } from '../types/overview';

export async function getOverview(farmId?: number): Promise<OverviewResponse> {
  const response = await client.get<OverviewResponse>('/overview', { params: farmId === undefined ? undefined : { farmId } });
  return response.data;
}
