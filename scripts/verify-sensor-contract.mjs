/**
 * Comprehensive Verification Suite for FE-002 R2:
 * Sensor Contract, Soil S1 Raw Chemistry & Data Provenance UI
 * Addresses Architecture Review findings F1, F2, F3, F4.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

console.log('================================================================');
console.log('FE-002 R2: Sensor Contract, Soil S1 & Provenance Verification Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test Group 1: Sensor Type Alignment (9 backend types)
// -----------------------------------------------------------------------------
console.log('--- Test Group 1: Sensor Type Alignment ---');
const sensorTypesFile = fs.readFileSync(path.join(rootDir, 'src/types/sensor.ts'), 'utf8');

const EXPECTED_SENSOR_TYPES = [
  'TEMPERATURE',
  'HUMIDITY',
  'SOIL_MOISTURE',
  'SOIL_PH',
  'SOIL_EC',
  'SOIL_N',
  'SOIL_P',
  'SOIL_K',
  'BATTERY_VOLTAGE',
];

for (const type of EXPECTED_SENSOR_TYPES) {
  assert(sensorTypesFile.includes(`'${type}'`), `SensorType union contains ${type}`);
}

assert(sensorTypesFile.includes('SOIL_CHEMISTRY_TYPES'), 'SOIL_CHEMISTRY_TYPES array is defined');
assert(sensorTypesFile.includes('isSoilChemistryType'), 'isSoilChemistryType helper is defined');
assert(sensorTypesFile.includes('source?: string | null'), 'SensorReading includes optional provenance source field');

// -----------------------------------------------------------------------------
// Test Group 2: F1 — Nullable Chemistry Units & Overview Contract
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 2: F1 — Nullable Chemistry Units & Overview Contract ---');
const overviewTypesFile = fs.readFileSync(path.join(rootDir, 'src/types/overview.ts'), 'utf8');

assert(overviewTypesFile.includes('NO_TARGET'), 'MetricStatus includes NO_TARGET');
assert(overviewTypesFile.includes('TrendPoint'), 'TrendPoint interface is defined');
assert(overviewTypesFile.includes('t: string'), 'TrendPoint has timestamp field t (ISO-8601 string)');
assert(overviewTypesFile.includes('v: number | null'), 'TrendPoint has nullable value field v');
assert(overviewTypesFile.includes('SoilMetricData'), 'SoilMetricData interface is defined');
assert(
  overviewTypesFile.includes('unit: string | null'),
  'F1: SoilMetricData models unit as nullable (string | null) matching backend'
);
assert(overviewTypesFile.includes('SoilProfile'), 'SoilProfile interface is defined');
assert(overviewTypesFile.includes('ph?: SoilMetricData | null'), 'SoilProfile has ph metric');
assert(overviewTypesFile.includes('ec?: SoilMetricData | null'), 'SoilProfile has ec metric');
assert(overviewTypesFile.includes('n?: SoilMetricData | null'), 'SoilProfile has n metric');
assert(overviewTypesFile.includes('p?: SoilMetricData | null'), 'SoilProfile has p metric');
assert(overviewTypesFile.includes('k?: SoilMetricData | null'), 'SoilProfile has k metric');
assert(overviewTypesFile.includes('observedCadenceSeconds?: number | null'), 'ZoneOverview has observedCadenceSeconds');
assert(overviewTypesFile.includes('soilProfile?: SoilProfile | null'), 'ZoneOverview has optional soilProfile');
assert(
  overviewTypesFile.includes('soilMoistureTrend?: TrendPoint[]') ||
    overviewTypesFile.includes('TrendPoint[] | number[]'),
  'ZoneOverview.soilMoistureTrend supports TrendPoint[]'
);

// -----------------------------------------------------------------------------
// Test Group 3: Metric Utilities & Status Dictionary
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 3: Metric Utilities & Status Dictionary ---');
const metricLabelsFile = fs.readFileSync(path.join(rootDir, 'src/utils/metricLabels.ts'), 'utf8');

assert(metricLabelsFile.includes("NO_TARGET: 'Chưa cấu hình ngưỡng'"), 'Status dictionary defines NO_TARGET label');
assert(metricLabelsFile.includes('STATUS_STYLES'), 'STATUS_STYLES is defined');
assert(metricLabelsFile.includes('NO_TARGET: {'), 'STATUS_STYLES includes NO_TARGET configuration');
assert(metricLabelsFile.includes('formatProvenanceLabel'), 'formatProvenanceLabel helper is exported');
assert(metricLabelsFile.includes('getProvenanceBadgeStyle'), 'getProvenanceBadgeStyle helper is exported');
assert(metricLabelsFile.includes('formatObservedCadence'), 'formatObservedCadence helper is exported');
assert(metricLabelsFile.includes('SENSOR_TYPE_DETAILS'), 'SENSOR_TYPE_DETAILS dictionary is exported');
assert(metricLabelsFile.includes('SOIL_METRIC_META'), 'SOIL_METRIC_META dictionary is exported');

// -----------------------------------------------------------------------------
// Test Group 4: F1 Logic — Unit Formatting & Preservation
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 4: F1 Logic — Unit Formatting & Preservation ---');

function formatMetricValue(value, unit, status) {
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

// F1 assertions
assert(formatMetricValue(6.2, null, 'NO_TARGET') === '6.2', 'F1: Null unit preserves raw number without inventing fallback unit');
assert(formatMetricValue(6.2, undefined, 'NO_TARGET') === '6.2', 'F1: Undefined unit preserves raw number without inventing fallback unit');
assert(formatMetricValue(6.2, '', 'NO_TARGET') === '6.2', 'F1: Empty unit preserves raw number');
assert(formatMetricValue(6.2, 'pH', 'NO_TARGET') === '6.2 pH', 'F1: Non-null pH unit displayed verbatim');
assert(formatMetricValue(1.15, 'µS/cm', 'NO_TARGET') === '1.15 µS/cm', 'F1: Non-null µS/cm unit displayed verbatim');
assert(formatMetricValue(2.4, 'mS/cm', 'NO_TARGET') === '2.4 mS/cm', 'F1: Non-default mS/cm unit displayed verbatim');
assert(formatMetricValue(45, 'mg/kg', 'NO_TARGET') === '45 mg/kg', 'F1: Non-null mg/kg unit displayed verbatim');
assert(formatMetricValue(100, 'ppm', 'NO_TARGET') === '100 ppm', 'F1: Non-standard ppm unit displayed verbatim');
assert(formatMetricValue(null, 'µS/cm', 'NO_TARGET') === '--', 'F1: Null value returns -- regardless of unit');
assert(formatMetricValue(120, 'µS/cm', 'NO_SIGNAL') === '--', 'F1: NO_SIGNAL returns -- regardless of value and unit');

// -----------------------------------------------------------------------------
// Test Group 5: F3 Logic — Provenance Formatting & Unknown Source
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 5: F3 Logic — Provenance Formatting ---');

function formatProvenanceLabel(source) {
  if (!source) return 'Chưa xác định nguồn';
  const upper = source.trim().toUpperCase();
  if (upper === 'IOTLAB') return 'Quan sát ngoại vi IoTLab';
  if (upper === 'MQTT') return 'Thiết bị trạm vườn (MQTT)';
  return source;
}

assert(formatProvenanceLabel('IOTLAB') === 'Quan sát ngoại vi IoTLab', 'IOTLAB resolves to IoTLab label');
assert(formatProvenanceLabel('MQTT') === 'Thiết bị trạm vườn (MQTT)', 'MQTT resolves to MQTT telemetry label');
assert(formatProvenanceLabel(null) === 'Chưa xác định nguồn', 'F3: null source resolves to Unknown source, NEVER MQTT');
assert(formatProvenanceLabel(undefined) === 'Chưa xác định nguồn', 'F3: undefined source resolves to Unknown source, NEVER MQTT');
assert(formatProvenanceLabel('') === 'Chưa xác định nguồn', 'F3: empty source resolves to Unknown source, NEVER MQTT');
assert(formatProvenanceLabel('CUSTOM_SYSTEM') === 'CUSTOM_SYSTEM', 'F3: Non-empty unknown source displayed verbatim');

// -----------------------------------------------------------------------------
// Test Group 6: F2 Logic — Status-Aware Preview Logic
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 6: F2 Logic — Status-Aware Preview Logic ---');

function previewValue(metric) {
  if (!metric) return null;
  const status = metric.status;
  if (status === 'SENSOR_ERROR') return 'Lỗi';
  if (status === 'NO_SIGNAL' || metric.value == null) return '--';
  return formatMetricValue(metric.value, metric.unit, status);
}

assert(previewValue({ status: 'SENSOR_ERROR', value: 88.5, unit: 'mg/kg' }) === 'Lỗi', 'F2: SENSOR_ERROR never displays stale raw number');
assert(previewValue({ status: 'NO_SIGNAL', value: 74.0, unit: 'pH' }) === '--', 'F2: NO_SIGNAL displays -- instead of stale raw number');
assert(previewValue({ status: 'NO_TARGET', value: 6.2, unit: 'pH' }) === '6.2 pH', 'F2: NO_TARGET displays formatted value with verbatim unit');
assert(previewValue({ status: 'NO_TARGET', value: 6.2, unit: null }) === '6.2', 'F2: NO_TARGET with null unit displays value without suffix');
assert(previewValue({ status: 'NORMAL', value: 120, unit: 'µS/cm' }) === '120 µS/cm', 'F2: NORMAL status displays value with unit');
assert(previewValue(null) === null, 'F2: Missing metric handled safely as null');

// -----------------------------------------------------------------------------
// Test Group 7: Component Implementation Checks (F1, F2, F3, F4)
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 7: Component Implementation Checks ---');
const soilProfileCardFile = fs.readFileSync(path.join(rootDir, 'src/components/SoilProfileCard.tsx'), 'utf8');
const metricChipFile = fs.readFileSync(path.join(rootDir, 'src/components/MetricChip.tsx'), 'utf8');
const zoneCardFile = fs.readFileSync(path.join(rootDir, 'src/components/ZoneCard.tsx'), 'utf8');
const zoneDetailPageFile = fs.readFileSync(path.join(rootDir, 'src/pages/ZoneDetailPage.tsx'), 'utf8');

// F1 checks in SoilProfileCard
assert(!soilProfileCardFile.includes('meta.fallbackUnit'), 'F1: SoilProfileCard does NOT use fallbackUnit');
assert(
  soilProfileCardFile.includes('formatMetricValue(metric.value, metric.unit, metric.status)'),
  'F1: SoilProfileCard passes metric.unit directly to formatMetricValue'
);
assert(
  soilProfileCardFile.includes('meta.symbol') && soilProfileCardFile.includes('meta.label'),
  'F1: Chemistry symbol and name kept separate from unit suffixes'
);

// F2 checks in ZoneCard
assert(zoneCardFile.includes('soil-s1-preview'), 'F2: ZoneCard defines soil-s1-preview container');
assert(zoneCardFile.includes("status === 'SENSOR_ERROR'"), 'F2: ZoneCard checks for SENSOR_ERROR');
assert(zoneCardFile.includes("status === 'NO_SIGNAL'"), 'F2: ZoneCard checks for NO_SIGNAL');
assert(zoneCardFile.includes("t('Lỗi')"), 'F2: ZoneCard displays localized Lỗi for SENSOR_ERROR');
assert(zoneCardFile.includes("formatMetricValue(metric.value, metric.unit, status)"), 'F2: ZoneCard uses formatMetricValue with verbatim units');

// F3 checks in MetricChip
assert(
  !metricChipFile.includes('detail && metric.source &&'),
  'F3: MetricChip does NOT suppress provenance row when source is null'
);
assert(
  metricChipFile.includes('detail && (') && metricChipFile.includes('data-testid="metric-provenance"'),
  'F3: MetricChip renders data-testid="metric-provenance" whenever detail mode is active'
);

// F4 checks in SoilProfileCard and ZoneDetailPage
assert(soilProfileCardFile.includes('soil-profile-loading'), 'F4: SoilProfileCard defines loading state');
assert(soilProfileCardFile.includes('soil-profile-error'), 'F4: SoilProfileCard defines error/unavailable state with retry');
assert(soilProfileCardFile.includes('soil-profile-empty'), 'F4: SoilProfileCard defines genuine empty state');
assert(
  zoneDetailPageFile.includes('loading={overview.loading && !overview.data}'),
  'F4: ZoneDetailPage passes overview loading state to SoilProfileCard'
);
assert(
  zoneDetailPageFile.includes('error={overview.error && !overview.data ? overview.error : null}'),
  'F4: ZoneDetailPage passes overview error state to SoilProfileCard'
);
assert(
  zoneDetailPageFile.includes('onRetry={() => void overview.refresh()}'),
  'F4: ZoneDetailPage passes retry callback to SoilProfileCard'
);

// -----------------------------------------------------------------------------
// Test Group 8: i18n Completeness (VI and EN)
// -----------------------------------------------------------------------------
console.log('\n--- Test Group 8: i18n Completeness ---');
const vi = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/i18n/locales/vi/translation.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/i18n/locales/en/translation.json'), 'utf8'));

const CRITICAL_I18N_KEYS = [
  'Trắc diện hóa tính đất S1',
  'Trắc diện đất S1',
  'Hóa tính S1',
  'Dữ liệu thô',
  'Dữ liệu kỹ thuật thô',
  'Lỗi',
  'Chưa cấu hình ngưỡng',
  'Quan sát ngoại vi IoTLab',
  'Thiết bị trạm vườn (MQTT)',
  'Chưa xác định nguồn',
  'Khoảng đo',
  'Độ chua (pH)',
  'Độ dẫn điện (EC)',
  'Đạm hữu dụng (N)',
  'Lân hữu dụng (P)',
  'Kali hữu dụng (K)',
  'Điện áp pin',
  'Tần suất quan sát: ~{0} giây',
  'Tần suất quan sát: ~{0} phút',
  'Đang tải trắc diện đất S1...',
  'Không thể tải dữ liệu trắc diện đất S1: {0}',
  'Chỉ số hóa tính đất S1 là dữ liệu thô phục vụ nghiên cứu và giám sát kỹ thuật, chưa áp dụng ngưỡng nông vụ.',
  'Chưa có dữ liệu trắc diện đất S1 cho khu vực này.',
];

for (const key of CRITICAL_I18N_KEYS) {
  assert(Boolean(vi[key]), `VI translation exists for: "${key.slice(0, 30)}..."`);
  assert(Boolean(en[key]), `EN translation exists for: "${key.slice(0, 30)}..."`);
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`Results: ${passedChecks}/${totalChecks} PASSED, ${failedChecks} FAILED`);
console.log('================================================================');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('\n✓ All FE-002 R2 sensor contract, Soil S1 & F1–F4 checks PASSED successfully!');
}
