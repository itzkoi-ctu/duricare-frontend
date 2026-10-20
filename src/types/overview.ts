import type { GrowthStage } from './zone';

export type MetricStatus = 'NORMAL' | 'LOW' | 'HIGH' | 'SENSOR_ERROR' | 'NO_SIGNAL' | 'NO_TARGET';

export interface MetricData {
  value: number | null;
  unit: string;
  recordedAt: string | null;
  status: MetricStatus;
  targetMin: number | null;
  targetMax: number | null;
  source?: string | null;
}

export interface ZoneMetrics {
  temperature: MetricData;
  humidity: MetricData;
  soilMoisture: MetricData;
}

export interface ZoneAlertCounts {
  hard: number;
  agentic: number;
}

/** Matches backend DTO: ctu.project.DuriCare.device.dto.TrendPoint */
export interface TrendPoint {
  t: string; // ISO 8601 Instant
  v: number | null;
}

/** Matches backend DTO: ctu.project.DuriCare.device.dto.SoilMetricResponse */
export interface SoilMetricData {
  value: number | null;
  unit: string | null;
  recordedAt: string | null;
  status: MetricStatus;
  source?: string | null;
}

/** Matches backend DTO: ctu.project.DuriCare.device.dto.SoilProfileResponse */
export interface SoilProfile {
  ph?: SoilMetricData | null;
  ec?: SoilMetricData | null;
  n?: SoilMetricData | null;
  p?: SoilMetricData | null;
  k?: SoilMetricData | null;
}

export interface ZoneOverview {
  code: string;
  name: string;
  growthStage: GrowthStage | string | null;
  variety: string | null;
  plantingDate: string | null;
  metrics: ZoneMetrics;
  alerts: ZoneAlertCounts;
  /** Optional soil moisture trend readings for sparkline */
  soilMoistureTrend?: TrendPoint[] | number[] | null;
  /** Observed reporting cadence in seconds (not guaranteed sampling rate) */
  observedCadenceSeconds?: number | null;
  /** Optional Soil S1 profile (raw chemistry metrics) */
  soilProfile?: SoilProfile | null;
}

export interface LatestInsight {
  zoneCode: string | null;
  message: string;
  createdAt: string;
}

export interface WeatherOverview {
  temperature: number;
  humidity: number;
  weatherCode: number;
  precipitationProbabilityToday: number;
  expectedRainMm48h: number;
  fetchedAt: string;
  source: string;
}

export interface OverviewResponse {
  farmName: string | null;
  generatedAt: string;
  totalUnresolvedAlerts: number;
  zones: ZoneOverview[];
  latestInsight: LatestInsight | null;
  weather?: WeatherOverview | null;
}
