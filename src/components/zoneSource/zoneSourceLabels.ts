import type { SensorType } from '../../types/sensor';
import type {
  AcquisitionSupport,
  MappingHealthState,
  RecordingEvidenceState,
  ZoneSourceOperationKind,
} from '../../types/zoneSource';

export function getSensorTypeDisplayName(
  type: SensorType | string,
  t: (k: string) => string = k => k
): string {
  switch (type) {
    case 'SOIL_MOISTURE':
      return t('Độ ẩm đất');
    case 'TEMPERATURE':
      return t('Nhiệt độ không khí');
    case 'HUMIDITY':
      return t('Độ ẩm không khí');
    case 'SOIL_PH':
      return t('Độ pH đất');
    case 'SOIL_EC':
      return t('Độ dẫn điện đất (EC)');
    case 'SOIL_N':
      return t('Đạm trong đất (N)');
    case 'SOIL_P':
      return t('Lân trong đất (P)');
    case 'SOIL_K':
      return t('Kali trong đất (K)');
    case 'BATTERY_VOLTAGE':
      return t('Điện áp pin');
    default:
      return type;
  }
}

export function getAcquisitionSupportMeta(
  support: AcquisitionSupport,
  t: (k: string) => string = k => k
): { label: string; badgeClass: string } {
  switch (support) {
    case 'LEGACY_MQTT_COMPATIBLE':
      return {
        label: t('MQTT tương thích'),
        badgeClass:
          'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
      };
    case 'IOTLAB_BOUND_MAPPING':
      return {
        label: t('IoTLab đã gắn'),
        badgeClass:
          'bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'REGISTRY_ONLY':
    default:
      return {
        label: t('Chỉ lưu thông tin'),
        badgeClass:
          'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

export function getEvidenceStateMeta(
  state: RecordingEvidenceState,
  t: (k: string) => string = k => k
): { label: string; dotClass: string; badgeClass: string } {
  switch (state) {
    case 'RECORDED_RECENTLY':
      return {
        label: t('Đã ghi nhận gần đây'),
        dotClass: 'bg-emerald-500 dark:bg-emerald-400',
        badgeClass:
          'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'RECORDED_OLD':
      return {
        label: t('Đã có bản ghi trước đây'),
        dotClass: 'bg-amber-500 dark:bg-amber-400',
        badgeClass:
          'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      };
    case 'TIME_INCONSISTENT':
      return {
        label: t('Thời điểm ghi nhận không nhất quán'),
        dotClass: 'bg-amber-600 dark:bg-amber-400',
        badgeClass:
          'bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      };
    case 'NEVER_RECORDED':
    default:
      return {
        label: t('Chưa có bản ghi cho lần gán này'),
        dotClass: 'bg-slate-400 dark:bg-slate-500',
        badgeClass:
          'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

export function getMappingStateMeta(
  state: MappingHealthState,
  t: (k: string) => string = k => k
): { label: string; badgeClass: string } {
  switch (state) {
    case 'READY':
      return {
        label: t('Sẵn sàng thu thập'),
        badgeClass:
          'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'BLOCKED':
      return {
        label: t('Tạm ngắt (BLOCKED)'),
        badgeClass:
          'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
      };
    case 'DISABLED':
    default:
      return {
        label: t('Đã tắt'),
        badgeClass:
          'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

export function getOperationKindLabel(
  kind: ZoneSourceOperationKind,
  t: (k: string) => string = k => k
): string {
  switch (kind) {
    case 'REGISTER_NODE':
      return t('Đăng ký trạm / thiết bị');
    case 'REGISTER_STREAM':
      return t('Đăng ký luồng dữ liệu');
    case 'ASSIGN':
      return t('Gán / Cấu hình nguồn');
    case 'REPLACE':
      return t('Thay thế nguồn');
    case 'DISABLE':
      return t('Ngừng gán nguồn');
  }
}
