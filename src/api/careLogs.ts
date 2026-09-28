import client from './client';
import type { CareLog } from '../types/careLog';

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
