import client from './client';
import type { CareLog, CareLogRequest } from '../types/careLog';

/** POST /api/care-logs — zoneId is required, performedAt defaults on the server. */
export async function createCareLog(request: CareLogRequest): Promise<CareLog> {
  const response = await client.post<CareLog>('/care-logs', request);
  return response.data;
}

/** GET /api/care-logs — returns all care logs */
export async function getCareLogs(): Promise<CareLog[]> {
  const response = await client.get<CareLog[]>('/care-logs');
  return response.data;
}

/** Fetch care logs for a specific zone by filtering GET /api/care-logs on client side */
export async function getCareLogsByZoneCode(zoneCode: string): Promise<CareLog[]> {
  const logs = await getCareLogs();
  return logs.filter((log) => log.zoneCode === zoneCode);
}
