import client from './client';
import type { Alert } from '../types/alert';

/** GET /api/alerts?resolved=false — returns all unresolved alerts across every zone */
export async function getUnresolvedAlerts(): Promise<Alert[]> {
  const response = await client.get<Alert[]>('/alerts', {
    params: { resolved: false },
  });
  return response.data;
}

/** GET /api/alerts — fetch alerts with optional resolved flag filter */
export async function getAlerts(resolved = false): Promise<Alert[]> {
  const response = await client.get<Alert[]>('/alerts', {
    params: { resolved },
  });
  return response.data;
}
