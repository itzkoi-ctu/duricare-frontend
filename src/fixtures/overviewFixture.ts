import type { OverviewResponse } from '../types/overview';

const now = Date.now();
const minute = 60 * 1000;

/**
 * Dev-only test fixture covering all required states:
 * NORMAL, LOW, HIGH, SENSOR_ERROR, NO_SIGNAL, NO_TARGET.
 * Tree-shaken and excluded from production builds.
 */
export const mockOverviewData: OverviewResponse = {
  farmName: 'Vườn Sầu Riêng Cái Mơn',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 3,
  latestInsight: {
    zoneCode: 'ZONE-01',
    message: 'Nhiệt độ Zone 1 bất thường (-7.5°C) nghi ngờ lỗi đầu dò cảm biến nhiệt độ. Zone 2 độ ẩm đất cao (>88%) trong giai đoạn phát triển trái cần mở mương tiêu.',
    createdAt: new Date(now - 25 * minute).toISOString(),
  },
  weather: {
    temperature: 32.8,
    humidity: 78.0,
    weatherCode: 2, // Nắng gián đoạn
    precipitationProbabilityToday: 25,
    expectedRainMm48h: 12.5,
    fetchedAt: new Date(now - 10 * minute).toISOString(),
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
      observedCadenceSeconds: 60.0,
      soilMoistureTrend: [
        { t: new Date(now - 60 * minute).toISOString(), v: 72.0 },
        { t: new Date(now - 50 * minute).toISOString(), v: 73.0 },
        { t: new Date(now - 40 * minute).toISOString(), v: 75.0 },
        { t: new Date(now - 30 * minute).toISOString(), v: 76.0 },
        { t: new Date(now - 20 * minute).toISOString(), v: 75.0 },
        { t: new Date(now - 10 * minute).toISOString(), v: 74.0 },
        { t: new Date(now - 2 * minute).toISOString(), v: 74.0 },
      ],
      metrics: {
        temperature: {
          value: -7.5,
          unit: '°C',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'SENSOR_ERROR',
          targetMin: 24.0,
          targetMax: 30.0,
          source: 'MQTT',
        },
        humidity: {
          value: 70.0,
          unit: '%',
          recordedAt: new Date(now - 8 * minute).toISOString(),
          status: 'LOW',
          targetMin: 75.0,
          targetMax: 85.0,
          source: 'MQTT',
        },
        soilMoisture: {
          value: 74.0,
          unit: '%',
          recordedAt: new Date(now - 3 * minute).toISOString(),
          status: 'NORMAL',
          targetMin: 70.0,
          targetMax: 80.0,
          source: 'MQTT',
        },
      },
      soilProfile: {
        ph: {
          value: 6.2,
          unit: 'pH',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        ec: {
          value: 1.15,
          unit: 'µS/cm',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        n: {
          value: 45.0,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        p: {
          value: 28.5,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        k: {
          value: 120.0,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
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
      observedCadenceSeconds: 120.0,
      soilMoistureTrend: [
        { t: new Date(now - 60 * minute).toISOString(), v: 78.0 },
        { t: new Date(now - 50 * minute).toISOString(), v: 81.0 },
        { t: new Date(now - 40 * minute).toISOString(), v: 83.0 },
        { t: new Date(now - 30 * minute).toISOString(), v: 85.0 },
        { t: new Date(now - 20 * minute).toISOString(), v: 87.0 },
        { t: new Date(now - 10 * minute).toISOString(), v: 88.0 },
        { t: new Date(now - 2 * minute).toISOString(), v: 86.0 },
      ],
      metrics: {
        temperature: {
          value: 33.2,
          unit: '°C',
          recordedAt: new Date(now - 4 * minute).toISOString(),
          status: 'HIGH',
          targetMin: 24.0,
          targetMax: 30.0,
          source: 'MQTT',
        },
        humidity: {
          value: 89.5,
          unit: '%',
          recordedAt: new Date(now - 4 * minute).toISOString(),
          status: 'HIGH',
          targetMin: 75.0,
          targetMax: 85.0,
          source: 'MQTT',
        },
        soilMoisture: {
          value: 86.0,
          unit: '%',
          recordedAt: new Date(now - 2 * minute).toISOString(),
          status: 'HIGH',
          targetMin: 60.0,
          targetMax: 80.0,
          source: 'MQTT',
        },
      },
      soilProfile: null, // Verifies safe handling when soilProfile is null
    },
    {
      code: 'ZONE-03',
      name: 'Khu C (Lô 1)',
      growthStage: 'KIEN_THIET_CO_BAN',
      variety: 'Ri6',
      plantingDate: '2023-01-10',
      alerts: { hard: 0, agentic: 0 },
      // soilMoistureTrend is absent (undefined) to verify that no sparkline renders without fake data
      // soilProfile is absent to verify empty state
      metrics: {
        temperature: {
          value: null,
          unit: '°C',
          recordedAt: new Date(now - 75 * minute).toISOString(), // > 60m stale
          status: 'NO_SIGNAL',
          targetMin: 24.0,
          targetMax: 30.0,
          source: null,
        },
        humidity: {
          value: null,
          unit: '%',
          recordedAt: null,
          status: 'NO_SIGNAL',
          targetMin: 75.0,
          targetMax: 85.0,
          source: null,
        },
        soilMoisture: {
          value: null,
          unit: '%',
          recordedAt: null,
          status: 'NO_SIGNAL',
          targetMin: 65.0,
          targetMax: 80.0,
          source: null,
        },
      },
    },
  ],
};
