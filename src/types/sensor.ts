/** Matches backend enum: ctu.project.DuriCare.device.enums.SensorType */
export type SensorType =
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'SOIL_MOISTURE'
  | 'SOIL_PH'
  | 'SOIL_EC'
  | 'SOIL_N'
  | 'SOIL_P'
  | 'SOIL_K'
  | 'BATTERY_VOLTAGE';

export const SOIL_CHEMISTRY_TYPES: readonly SensorType[] = [
  'SOIL_PH',
  'SOIL_EC',
  'SOIL_N',
  'SOIL_P',
  'SOIL_K',
] as const;

export function isSoilChemistryType(type: SensorType): boolean {
  return (SOIL_CHEMISTRY_TYPES as readonly string[]).includes(type);
}

export interface SensorMetadata {
  id: number;
  zoneCode: string;
  type: SensorType;
  unit: string;
}

/**
 * Matches backend DTO: ctu.project.DuriCare.device.dto.SensorReadingResponse
 * Note: backend field is "recordAt" (not "recordedAt").
 * Optional "source" indicates data provenance (e.g. 'IOTLAB', 'MQTT', or null/unknown).
 */
export interface SensorReading {
  id: number;
  sensorId: number;
  value: number;
  recordAt: string; // ISO 8601 Instant from backend
  source?: string | null;
}
