import client from './client';
import type { OverviewResponse } from '../types/overview';

export async function getOverview(): Promise<OverviewResponse> {
  const response = await client.get<OverviewResponse>('/overview');
  return response.data;
}
