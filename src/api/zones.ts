import client from './client';
import type { Zone, ZoneRequest } from '../types/zone';
import type { SensorMetadata, SensorReading, SensorType } from '../types/sensor';

/** GET /api/zones — returns all zones */
export async function getZones(): Promise<Zone[]> {
  const response = await client.get<Zone[]>('/zones');
  return response.data;
}

export async function getZoneByCode(code: string): Promise<Zone> {
  return (await client.get<Zone>(`/zones/by-code/${encodeURIComponent(code)}`)).data;
}

export async function createZone(request: ZoneRequest): Promise<Zone> {
  return (await client.post<Zone>('/zones', request)).data;
}

export async function updateZone(id: number, request: ZoneRequest): Promise<Zone> {
  return (await client.put<Zone>(`/zones/${id}`, request)).data;
}

export async function getSensors(code: string): Promise<SensorMetadata[]> {
  return (await client.get<SensorMetadata[]>(`/zones/${encodeURIComponent(code)}/sensors`)).data;
}

/**
 * GET /api/zones/{zoneCode}/sensors/{type}/latest
 * Returns the most recent sensor reading for a specific type in a zone.
 * type must be uppercase to match the backend enum exactly.
 */
export async function getLatestReading(
  zoneCode: string,
  type: SensorType,
): Promise<SensorReading> {
  const response = await client.get<SensorReading>(
    `/zones/${zoneCode}/sensors/${type}/latest`,
  );
  return response.data;
}

/**
 * GET /api/zones/{zoneCode}/sensors/{type}/readings?from=...&to=...
 * Returns historical sensor readings for a zone + sensor type within a time range.
 * from/to are ISO-8601 Instant strings. Both are optional on the backend.
 */
export async function getReadings(
  zoneCode: string,
  type: SensorType,
  from?: string,
  to?: string,
): Promise<SensorReading[]> {
  const response = await client.get<SensorReading[]>(
    `/zones/${zoneCode}/sensors/${type}/readings`,
    { params: { from, to } },
  );
  return response.data;
}
