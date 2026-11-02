import type { PublicationStatus, JobStatus, JobKind, RunStatus } from '../types/publication';

export interface StatusConfig {
  labelVi: string;
  labelEn: string;
  classes: string;
  icon: string;
}

export const PUBLICATION_STATUS_CONFIG: Record<PublicationStatus, StatusConfig> = {
  PENDING: {
    labelVi: 'Chờ xuất bản',
    labelEn: 'Pending',
    classes: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    icon: 'hourglass_top',
  },
  ACTIVE: {
    labelVi: 'Đang hoạt động trong RAG',
    labelEn: 'Active in RAG',
    classes: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    icon: 'check_circle',
  },
  SUPERSEDED: {
    labelVi: 'Đã thay thế',
    labelEn: 'Superseded',
    classes: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
    icon: 'history',
  },
  REVOKED: {
    labelVi: 'Đã thu hồi',
    labelEn: 'Revoked',
    classes: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    icon: 'block',
  },
};

export const JOB_STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  QUEUED: {
    labelVi: 'Đang chờ hàng đợi',
    labelEn: 'Queued',
    classes: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800',
    icon: 'schedule',
  },
  RUNNING: {
    labelVi: 'Đang chạy',
    labelEn: 'Running',
    classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
    icon: 'sync',
  },
  RETRY_WAIT: {
    labelVi: 'Chờ thử lại',
    labelEn: 'Retry Wait',
    classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
    icon: 'update',
  },
  WAITING_GATE: {
    labelVi: 'Chờ mở cổng',
    labelEn: 'Waiting Gate',
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800',
    icon: 'lock_clock',
  },
  SUCCEEDED: {
    labelVi: 'Thành công',
    labelEn: 'Succeeded',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
    icon: 'check',
  },
  FAILED: {
    labelVi: 'Thất bại',
    labelEn: 'Failed',
    classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
    icon: 'error_outline',
  },
  CANCELLED: {
    labelVi: 'Đã hủy',
    labelEn: 'Cancelled',
    classes: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700',
    icon: 'cancel',
  },
};

export const JOB_KIND_CONFIG: Record<JobKind, { labelVi: string; labelEn: string; icon: string }> = {
  INDEX: {
    labelVi: 'Chỉ mục hóa (INDEX)',
    labelEn: 'Index (INDEX)',
    icon: 'database',
  },
  CLEANUP: {
    labelVi: 'Dọn dẹp vector (CLEANUP)',
    labelEn: 'Cleanup (CLEANUP)',
    icon: 'delete_sweep',
  },
};

export const RUN_STATUS_CONFIG: Record<RunStatus, StatusConfig> = {
  RUNNING: {
    labelVi: 'Đang chạy',
    labelEn: 'Running',
    classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
    icon: 'sync',
  },
  VERIFIED: {
    labelVi: 'Đã xác minh',
    labelEn: 'Verified',
    classes: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800',
    icon: 'verified',
  },
  SUCCEEDED: {
    labelVi: 'Thành công',
    labelEn: 'Succeeded',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
    icon: 'check',
  },
  FAILED: {
    labelVi: 'Thất bại',
    labelEn: 'Failed',
    classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
    icon: 'error_outline',
  },
  EXPIRED: {
    labelVi: 'Hết hạn lease',
    labelEn: 'Expired',
    classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
    icon: 'timer_off',
  },
  CANCELLED: {
    labelVi: 'Đã hủy',
    labelEn: 'Cancelled',
    classes: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700',
    icon: 'cancel',
  },
};
