/** Matches backend enum: ctu.project.DuriCare.device.enums.SensorType */
export type SensorType = 'TEMPERATURE' | 'HUMIDITY' | 'SOIL_MOISTURE';

export interface SensorMetadata {
  id: number;
  zoneCode: string;
  type: SensorType;
  unit: string;
}

/**
 * Matches backend DTO: ctu.project.DuriCare.device.dto.SensorReadingResponse
 * Note: backend field is "recordAt" (not "recordedAt").
 */
export interface SensorReading {
  id: number;
  sensorId: number;
  value: number;
  recordAt: string; // ISO 8601 Instant from backend
}
