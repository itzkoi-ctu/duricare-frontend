import type { OverviewResponse } from '../types/overview';

/**
 * Dev-only test fixture covering all required states:
 * NORMAL, LOW, HIGH, SENSOR_ERROR, NO_SIGNAL.
 * Tree-shaken and excluded from production builds.
 */
export const mockOverviewData: OverviewResponse = {
  farmName: 'Vườn Sầu Riêng Cái Mơn',
  generatedAt: new Date().toISOString(),
  totalUnresolvedAlerts: 3,
  latestInsight: {
    zoneCode: 'ZONE-01',
    message: 'Nhiệt độ Zone 1 bất thường (-7.5°C) nghi ngờ lỗi đầu dò cảm biến nhiệt độ. Zone 2 độ ẩm đất cao (>88%) trong giai đoạn phát triển trái cần mở mương tiêu.',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  weather: {
    temperature: 32.8,
    humidity: 78.0,
    weatherCode: 2, // Nắng gián đoạn
    precipitationProbabilityToday: 25,
    expectedRainMm48h: 12.5,
    fetchedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    source: 'Trạm khí tượng Đại học Cần Thơ',
  },
  zones: [
    {
      code: 'ZONE-01',
      name: 'Khu A',
      growthStage: 'RA_HOA',
      variety: 'Ri6',
      plantingDate: '2022-03-15',
      alerts: { hard: 2, agentic: 1 },
      soilMoistureTrend: [72, 73, 75, 76, 75, 74, 74],
      metrics: {
        temperature: {
          value: -7.5,
          unit: '°C',
          recordedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          status: 'SENSOR_ERROR',
          targetMin: 24.0,
          targetMax: 30.0,
        },
        humidity: {
          value: 70.0,
          unit: '%',
          recordedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          status: 'LOW',
          targetMin: 75.0,
          targetMax: 85.0,
        },
        soilMoisture: {
          value: 74.0,
          unit: '%',
          recordedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          status: 'NORMAL',
          targetMin: 70.0,
          targetMax: 80.0,
        },
      },
    },
    {
      code: 'ZONE-02',
      name: 'Khu B',
      growthStage: 'PHAT_TRIEN_TRAI',
      variety: 'Monthong',
      plantingDate: '2021-08-20',
      alerts: { hard: 1, agentic: 0 },
      soilMoistureTrend: [78, 81, 83, 85, 87, 88, 86],
      metrics: {
        temperature: {
          value: 33.2,
          unit: '°C',
          recordedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
          status: 'HIGH',
          targetMin: 24.0,
          targetMax: 30.0,
        },
        humidity: {
          value: 89.5,
          unit: '%',
          recordedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
          status: 'HIGH',
          targetMin: 75.0,
          targetMax: 85.0,
        },
        soilMoisture: {
          value: 86.0,
          unit: '%',
          recordedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          status: 'HIGH',
          targetMin: 60.0,
          targetMax: 80.0,
        },
      },
    },
    {
      code: 'ZONE-03',
      name: 'Khu C (Lô 1)',
      growthStage: 'KIEN_THIET_CO_BAN',
      variety: 'Ri6',
      plantingDate: '2023-01-10',
      alerts: { hard: 0, agentic: 0 },
      // soilMoistureTrend is absent (undefined) to verify that no sparkline renders without fake data
      metrics: {
        temperature: {
          value: null,
          unit: '°C',
          recordedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(), // > 60m stale
          status: 'NO_SIGNAL',
          targetMin: 24.0,
          targetMax: 30.0,
        },
        humidity: {
          value: null,
          unit: '%',
          recordedAt: null,
          status: 'NO_SIGNAL',
          targetMin: 75.0,
          targetMax: 85.0,
        },
        soilMoisture: {
          value: null,
          unit: '%',
          recordedAt: null,
          status: 'NO_SIGNAL',
          targetMin: 65.0,
          targetMax: 80.0,
        },
      },
    },
  ],
};
