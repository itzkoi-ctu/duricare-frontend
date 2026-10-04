import { t, getLocale } from '../i18n';
import { useCallback, useEffect, useState } from 'react';
import { getZones, getReadings, getLatestReading } from '../api/zones';
import { getUnresolvedAlerts } from '../api/alerts';
import type { GrowthStage, Zone } from '../types/zone';
import type { SensorReading, SensorType } from '../types/sensor';
import type { Alert, AlertSource } from '../types/alert';
import { getReadingRange } from '../utils/readingRange';

/** A single point on the chart: timestamp + value */
export interface ChartDataPoint {
  /** Unix timestamp in ms — used as X axis */
  time: number;
  /** Human-readable label for tooltip */
  label: string;
  value: number;
}

export interface SensorChartData {
  loading: boolean;
  error: string | null;
  data: ChartDataPoint[];
}

export interface ZoneDetailData {
  zone: Zone | null;
  temperature: SensorChartData;
  humidity: SensorChartData;
  soilMoisture: SensorChartData;
  latestTemp: number | null;
  latestHumidity: number | null;
  latestSoilMoisture: number | null;
  alertCount: number;
  dominantAlertSource: AlertSource | null;
}

interface UseZoneDetailReturn {
  data: ZoneDetailData;
  loading: boolean;
  error: string | null;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  retry: () => void;
  applyGrowthStage: (stage: GrowthStage) => void;
}

function dateToInstant(dateStr: string, endOfDay = false): string {
  // Segmented periods supply exact Instants; retain compatibility with date-only callers.
  if (dateStr.includes('T')) return dateStr;
  if (endOfDay) {
    return `${dateStr}T23:59:59.999Z`;
  }
  return `${dateStr}T00:00:00.000Z`;
}

function toChartData(readings: SensorReading[]): ChartDataPoint[] {
  return readings
    .map((r) => {
      const d = new Date(r.recordAt);
      return {
        time: d.getTime(),
        label: d.toLocaleString(getLocale(), {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        value: r.value,
      };
    })
    .sort((a, b) => a.time - b.time);
}

function getDominantSource(alerts: Alert[]): AlertSource | null {
  if (alerts.length === 0) return null;
  if (alerts.some((a) => a.source === 'HARD')) return 'HARD';
  return 'AGENTIC';
}

const SENSOR_TYPES: SensorType[] = ['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE'];

export default function useZoneDetail(zoneCode: string): UseZoneDetailReturn {
  const [initialRange] = useState(() => getReadingRange('LAST_24_HOURS'));
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const [data, setData] = useState<ZoneDetailData>({
    zone: null,
    temperature: { loading: true, error: null, data: [] },
    humidity: { loading: true, error: null, data: [] },
    soilMoisture: { loading: true, error: null, data: [] },
    latestTemp: null,
    latestHumidity: null,
    latestSoilMoisture: null,
    alertCount: 0,
    dominantAlertSource: null,
  });

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);
  const applyGrowthStage = useCallback((growthStage: GrowthStage) => {
    setData(previous => ({ ...previous, zone: previous.zone ? { ...previous.zone, growthStage } : null }));
  }, []);

  // Fetch zone info + alerts + latest readings on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchBase() {
      setLoading(true);
      setError(null);

      try {
        const [zones, alerts] = await Promise.all([
          getZones(),
          getUnresolvedAlerts(),
        ]);

        if (cancelled) return;

        const zone = zones.find((z) => z.code === zoneCode) ?? null;
        if (!zone) {
          setError(t("Không tìm thấy vùng canh tác với mã \"{0}\"", [zoneCode]));
          setLoading(false);
          return;
        }

        const zoneAlerts = alerts.filter((a) => a.zoneCode === zoneCode);

        // Fetch latest readings in parallel (graceful per-sensor failure)
        const [latTemp, latHum, latSoil] = await Promise.all([
          getLatestReading(zoneCode, 'TEMPERATURE').catch(() => null),
          getLatestReading(zoneCode, 'HUMIDITY').catch(() => null),
          getLatestReading(zoneCode, 'SOIL_MOISTURE').catch(() => null),
        ]);

        if (cancelled) return;

        setData((prev) => ({
          ...prev,
          zone,
          latestTemp: latTemp?.value ?? null,
          latestHumidity: latHum?.value ?? null,
          latestSoilMoisture: latSoil?.value ?? null,
          alertCount: zoneAlerts.length,
          dominantAlertSource: getDominantSource(zoneAlerts),
        }));
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Lỗi không xác định");
        setLoading(false);
      }
    }

    fetchBase();
    return () => { cancelled = true; };
  }, [zoneCode, fetchKey]);

  // Fetch chart data whenever from/to changes
  useEffect(() => {
    let cancelled = false;

    async function fetchCharts() {
      setData((prev) => ({
        ...prev,
        temperature: { ...prev.temperature, loading: true, error: null },
        humidity: { ...prev.humidity, loading: true, error: null },
        soilMoisture: { ...prev.soilMoisture, loading: true, error: null },
      }));

      const fromInstant = dateToInstant(from);
      const toInstant = dateToInstant(to, true);

      const results = await Promise.all(
        SENSOR_TYPES.map((type) =>
          getReadings(zoneCode, type, fromInstant, toInstant)
            .then((readings) => ({ data: toChartData(readings), error: null }))
            .catch((err: unknown) => ({
              data: [] as ChartDataPoint[],
              error: err instanceof Error ? err.message : "Lỗi tải dữ liệu",
            })),
        ),
      );

      if (cancelled) return;

      setData((prev) => ({
        ...prev,
        temperature: { loading: false, error: results[0].error, data: results[0].data },
        humidity: { loading: false, error: results[1].error, data: results[1].data },
        soilMoisture: { loading: false, error: results[2].error, data: results[2].data },
      }));
    }

    fetchCharts();
    return () => { cancelled = true; };
  }, [zoneCode, from, to, fetchKey]);

  return { data, loading, error, from, to, setFrom, setTo, retry, applyGrowthStage };
}
