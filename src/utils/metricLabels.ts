import { t } from '../i18n';
import type { MetricStatus } from '../types/overview';
import type { SensorType } from '../types/sensor';

export type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'soilMoisture'
  | 'ph'
  | 'ec'
  | 'n'
  | 'p'
  | 'k'
  | 'batteryVoltage';

export const METRIC_NAMES: Record<MetricKey, { label: string; icon: string }> = {
  temperature: { label: 'Nhiệt độ', icon: 'device_thermostat' },
  humidity: { label: 'Ẩm KK', icon: 'water_drop' },
  soilMoisture: { label: 'Ẩm đất', icon: 'water_drop' },
  ph: { label: 'Độ pH đất', icon: 'science' },
  ec: { label: 'Độ dẫn điện EC', icon: 'electric_bolt' },
  n: { label: 'Đạm (N)', icon: 'grain' },
  p: { label: 'Lân (P)', icon: 'grain' },
  k: { label: 'Kali (K)', icon: 'grain' },
  batteryVoltage: { label: 'Điện áp pin', icon: 'battery_std' },
};

const DEFAULT_CHEMISTRY_STATUS: Record<MetricStatus, string> = {
  NORMAL: 'Bình thường',
  LOW: 'Thấp',
  HIGH: 'Cao',
  SENSOR_ERROR: 'Lỗi cảm biến',
  NO_SIGNAL: 'Mất tín hiệu',
  NO_TARGET: 'Chưa cấu hình ngưỡng',
};

export const METRIC_STATUS_DICTIONARY: Record<MetricKey, Record<MetricStatus, string>> = {
  temperature: {
    NORMAL: 'Lý tưởng',
    LOW: 'Hơi lạnh',
    HIGH: 'Nóng',
    SENSOR_ERROR: 'Lỗi cảm biến',
    NO_SIGNAL: 'Mất tín hiệu',
    NO_TARGET: 'Chưa cấu hình ngưỡng',
  },
  humidity: {
    NORMAL: 'Ổn định',
    LOW: 'Hơi khô',
    HIGH: 'Quá ẩm',
    SENSOR_ERROR: 'Lỗi cảm biến',
    NO_SIGNAL: 'Mất tín hiệu',
    NO_TARGET: 'Chưa cấu hình ngưỡng',
  },
  soilMoisture: {
    NORMAL: 'Đủ ẩm rễ',
    LOW: 'Thấp hơn ngưỡng',
    HIGH: 'Cao hơn ngưỡng',
    SENSOR_ERROR: 'Lỗi cảm biến',
    NO_SIGNAL: 'Mất tín hiệu',
    NO_TARGET: 'Chưa cấu hình ngưỡng',
  },
  ph: DEFAULT_CHEMISTRY_STATUS,
  ec: DEFAULT_CHEMISTRY_STATUS,
  n: DEFAULT_CHEMISTRY_STATUS,
  p: DEFAULT_CHEMISTRY_STATUS,
  k: DEFAULT_CHEMISTRY_STATUS,
  batteryVoltage: DEFAULT_CHEMISTRY_STATUS,
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
  NO_TARGET: {
    textColor: 'text-gray',
    badgeBg: 'bg-gray/15',
    badgeText: 'text-gray',
    borderColor: 'border-border',
  },
};

export function getStatusIcon(status: MetricStatus): string {
  switch (status) {
    case 'NORMAL':
      return 'check_circle';
    case 'LOW':
      return 'arrow_downward';
    case 'HIGH':
      return 'arrow_upward';
    case 'SENSOR_ERROR':
      return 'error';
    case 'NO_SIGNAL':
      return 'wifi_off';
    case 'NO_TARGET':
      return 'tune';
    default:
      return 'info';
  }
}

export function getStatusLabel(metric: MetricKey | string, status: MetricStatus): string {
  const dict = METRIC_STATUS_DICTIONARY[metric as MetricKey];
  return t(dict?.[status] ?? DEFAULT_CHEMISTRY_STATUS[status] ?? status);
}

export function formatTimeHHmm(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMetricValue(value: number | null, unit: string | null | undefined, status: MetricStatus): string {
  if (status === 'NO_SIGNAL') {
    return '--';
  }
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }
  const formatted = Number.isInteger(value)
    ? value.toString()
    : Math.abs(value * 10 - Math.round(value * 10)) < 1e-4
      ? value.toFixed(1)
      : value.toFixed(2);
  if (!unit) {
    return formatted;
  }
  const normalizedUnit = unit === 'C' ? '°C' : unit;
  if (normalizedUnit === '%' || normalizedUnit.startsWith('°')) {
    return `${formatted}${normalizedUnit}`;
  }
  return `${formatted} ${normalizedUnit}`;
}

export function formatTargetHint(targetMin: number | null, targetMax: number | null, unit: string | null | undefined): string | null {
  if (targetMin === null && targetMax === null) {
    return null;
  }
  const u = !unit ? '' : unit === '%' ? '%' : unit === 'C' || unit === '°C' ? '°C' : ` ${unit}`;
  if (targetMin !== null && targetMax !== null) {
    return t("Mục tiêu {0}–{1}{2}", [targetMin, targetMax, u]);
  }
  if (targetMin !== null) {
    return t("Mục tiêu ≥{0}{1}", [targetMin, u]);
  }
  return t("Mục tiêu ≤{0}{1}", [targetMax, u]);
}

export function formatNoSignalHint(recordedAt: string | null): string {
  if (!recordedAt) {
    return t("Chưa nhận được dữ liệu");
  }
  const time = formatTimeHHmm(recordedAt);
  return time ? t("Chưa nhận dữ liệu từ {0}", [time]) : t("Chưa nhận được dữ liệu");
}

export const SENSOR_TYPE_DETAILS: Record<SensorType, { label: string; unit: string; icon: string }> = {
  TEMPERATURE: { label: 'Nhiệt độ không khí', unit: '°C', icon: 'device_thermostat' },
  HUMIDITY: { label: 'Độ ẩm không khí', unit: '%', icon: 'water_drop' },
  SOIL_MOISTURE: { label: 'Độ ẩm đất', unit: '%', icon: 'water_drop' },
  SOIL_PH: { label: 'Độ pH đất', unit: 'pH', icon: 'science' },
  SOIL_EC: { label: 'Độ dẫn điện EC', unit: 'µS/cm', icon: 'electric_bolt' },
  SOIL_N: { label: 'Đạm (N)', unit: 'mg/kg', icon: 'grain' },
  SOIL_P: { label: 'Lân (P)', unit: 'mg/kg', icon: 'grain' },
  SOIL_K: { label: 'Kali (K)', unit: 'mg/kg', icon: 'grain' },
  BATTERY_VOLTAGE: { label: 'Điện áp pin', unit: 'V', icon: 'battery_std' },
};

export interface SoilMetricMeta {
  key: 'ph' | 'ec' | 'n' | 'p' | 'k';
  symbol: string;
  label: string;
  description: string;
}

export const SOIL_METRIC_META: Record<'ph' | 'ec' | 'n' | 'p' | 'k', SoilMetricMeta> = {
  ph: { key: 'ph', symbol: 'pH', label: 'Độ chua (pH)', description: 'Độ chua hoặc kiềm của đất' },
  ec: { key: 'ec', symbol: 'EC', label: 'Độ dẫn điện (EC)', description: 'Nồng độ muối và dinh dưỡng hòa tan' },
  n: { key: 'n', symbol: 'N', label: 'Đạm hữu dụng (N)', description: 'Hàm lượng Nitơ hữu dụng trong đất' },
  p: { key: 'p', symbol: 'P', label: 'Lân hữu dụng (P)', description: 'Hàm lượng Photpho dễ tiêu trong đất' },
  k: { key: 'k', symbol: 'K', label: 'Kali hữu dụng (K)', description: 'Hàm lượng Kali trao đổi trong đất' },
};

/**
 * Formats sensor/metric data provenance source.
 * Handles null/undefined as neutral Unknown source.
 * Never defaults or infers null to MQTT.
 */
export function formatProvenanceLabel(source?: string | null): string {
  if (!source) {
    return t('Chưa xác định nguồn');
  }
  const upper = source.trim().toUpperCase();
  if (upper === 'IOTLAB') {
    return t('Quan sát ngoại vi IoTLab');
  }
  if (upper === 'MQTT') {
    return t('Thiết bị trạm vườn (MQTT)');
  }
  return source;
}

export function getProvenanceBadgeStyle(source?: string | null): { bg: string; text: string; icon: string } {
  if (!source) {
    return { bg: 'bg-gray/10', text: 'text-gray', icon: 'help_outline' };
  }
  const upper = source.trim().toUpperCase();
  if (upper === 'IOTLAB') {
    return { bg: 'bg-blue/10 dark:bg-blue/20', text: 'text-navy dark:text-blue', icon: 'cloud_sync' };
  }
  if (upper === 'MQTT') {
    return { bg: 'bg-teal/10 dark:bg-teal/20', text: 'text-teal dark:text-teal', icon: 'sensors' };
  }
  return { bg: 'bg-gray/10', text: 'text-gray', icon: 'hub' };
}

/**
 * Formats observed reporting cadence in seconds.
 * Explicitly describes observed frequency, not guaranteed sampling interval.
 */
export function formatObservedCadence(seconds?: number | null): string | null {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return null;
  }
  const rounded = Math.round(seconds);
  if (rounded < 60) {
    return t('Tần suất quan sát: ~{0} giây', [rounded]);
  }
  const minutes = Math.round(rounded / 60);
  return t('Tần suất quan sát: ~{0} phút', [minutes]);
}
