import type { MetricStatus } from '../types/overview';

export type MetricKey = 'temperature' | 'humidity' | 'soilMoisture';

export const METRIC_NAMES: Record<MetricKey, { label: string; icon: string }> = {
  temperature: { label: 'Nhiệt độ', icon: 'device_thermostat' },
  humidity: { label: 'Ẩm KK', icon: 'water_drop' },
  soilMoisture: { label: 'Ẩm đất', icon: 'grass' },
};

export const METRIC_STATUS_DICTIONARY: Record<MetricKey, Record<MetricStatus, string>> = {
  temperature: {
    NORMAL: 'Lý tưởng',
    LOW: 'Hơi lạnh',
    HIGH: 'Nóng',
    SENSOR_ERROR: 'Lỗi cảm biến',
    NO_SIGNAL: 'Mất tín hiệu',
  },
  humidity: {
    NORMAL: 'Ổn định',
    LOW: 'Hơi khô',
    HIGH: 'Quá ẩm',
    SENSOR_ERROR: 'Lỗi cảm biến',
    NO_SIGNAL: 'Mất tín hiệu',
  },
  soilMoisture: {
    NORMAL: 'Đủ ẩm rễ',
    LOW: 'Thấp hơn ngưỡng',
    HIGH: 'Cao hơn ngưỡng',
    SENSOR_ERROR: 'Lỗi cảm biến',
    NO_SIGNAL: 'Mất tín hiệu',
  },
};

export interface StatusStyle {
  textColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const STATUS_STYLES: Record<MetricStatus, StatusStyle> = {
  NORMAL: {
    textColor: 'text-teal',
    badgeBg: 'bg-teal/15',
    badgeText: 'text-teal',
    borderColor: 'border-teal/30',
  },
  LOW: {
    textColor: 'text-amber',
    badgeBg: 'bg-amber/15',
    badgeText: 'text-amber',
    borderColor: 'border-amber/30',
  },
  HIGH: {
    textColor: 'text-coral',
    badgeBg: 'bg-coral/15',
    badgeText: 'text-coral',
    borderColor: 'border-coral/30',
  },
  SENSOR_ERROR: {
    textColor: 'text-coral',
    badgeBg: 'bg-coral/15',
    badgeText: 'text-coral',
    borderColor: 'border-coral/30',
  },
  NO_SIGNAL: {
    textColor: 'text-gray',
    badgeBg: 'bg-gray/15',
    badgeText: 'text-gray',
    borderColor: 'border-gray/30',
  },
};

export function getStatusLabel(metric: MetricKey, status: MetricStatus): string {
  return METRIC_STATUS_DICTIONARY[metric]?.[status] ?? status;
}

export function formatTimeHHmm(dateInput: string | Date | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMetricValue(value: number | null, unit: string, status: MetricStatus): string {
  if (status === 'NO_SIGNAL') {
    return '--';
  }
  if (value === null || isNaN(value)) {
    return '--';
  }
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${formatted}${unit}`;
}

export function formatTargetHint(targetMin: number | null, targetMax: number | null, unit: string): string | null {
  if (targetMin === null && targetMax === null) {
    return null;
  }
  const u = unit === '%' ? '%' : '°C';
  if (targetMin !== null && targetMax !== null) {
    return `Mục tiêu ${targetMin}–${targetMax}${u}`;
  }
  if (targetMin !== null) {
    return `Mục tiêu ≥${targetMin}${u}`;
  }
  return `Mục tiêu ≤${targetMax}${u}`;
}

export function formatNoSignalHint(recordedAt: string | null): string {
  if (!recordedAt) {
    return 'Chưa nhận được dữ liệu';
  }
  const time = formatTimeHHmm(recordedAt);
  return time ? `Chưa nhận dữ liệu từ ${time}` : 'Chưa nhận được dữ liệu';
}
