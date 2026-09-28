/** Matches backend enum: ctu.project.DuriCare.device.enums.AlertSource */
export type AlertSource = 'HARD' | 'AGENTIC';

/**
 * Matches backend DTO: ctu.project.DuriCare.device.alert.AlertResponse
 * severity and type are free-form strings in the backend entity.
 */
export interface Alert {
  id: number;
  type: string;
  severity: string;
  source: AlertSource;
  message: string;
  createdAt: string; // ISO 8601 Instant from backend
  resolved: boolean;
  zoneCode: string;
}
