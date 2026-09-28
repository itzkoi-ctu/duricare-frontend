import type { GrowthStage } from './zone';

export type MetricStatus = 'NORMAL' | 'LOW' | 'HIGH' | 'SENSOR_ERROR' | 'NO_SIGNAL';

export interface MetricData {
  value: number | null;
  unit: string;
  recordedAt: string | null;
  status: MetricStatus;
  targetMin: number | null;
  targetMax: number | null;
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

export interface ZoneOverview {
  code: string;
  name: string;
  growthStage: GrowthStage | string | null;
  variety: string | null;
  plantingDate: string | null;
  metrics: ZoneMetrics;
  alerts: ZoneAlertCounts;
  /** Optional soil moisture trend readings for sparkline */
  soilMoistureTrend?: number[];
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
