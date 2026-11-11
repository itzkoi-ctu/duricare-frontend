/**
 * FE-KNOWLEDGE-IMPORT-001 Utilities & UI configurations
 * Revision: C0-v2-P1-2026-11-09
 */

import type { WarningCode, LocatorStatus } from '../types/import';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatTimeRemaining(expiresAt: string): {
  text: string;
  isExpired: boolean;
  minutesRemaining: number;
} {
  try {
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = expiry - now;

    if (diff <= 0) {
      return { text: 'Đã hết hạn', isExpired: true, minutesRemaining: 0 };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      text: `${minutes} phút ${seconds} giây`,
      isExpired: false,
      minutesRemaining: minutes,
    };
  } catch {
    return { text: 'Không xác định', isExpired: false, minutesRemaining: 0 };
  }
}

export function stripText(s: string): string {
  if (!s) return '';
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

export const WARNING_CONFIG: Record<
  WarningCode,
  { label: string; description: string; severity: 'warning' | 'info' }
> = {
  PDF_READING_ORDER_REVIEW: {
    label: 'Thứ tự đọc PDF',
    description: 'Tài liệu PDF có thể có nhiều cột hoặc khung văn bản; vui lòng rà soát thứ tự đọc các đoạn trích.',
    severity: 'warning',
  },
  DOCX_LAYOUT_REVIEW: {
    label: 'Bố cục DOCX',
    description: 'Tài liệu DOCX có định dạng bảng hoặc khung đặc biệt; vui lòng kiểm tra tính toàn vẹn của nội dung.',
    severity: 'warning',
  },
  TRACKED_CHANGES_VIEW: {
    label: 'Chế độ xem vết sửa đổi',
    description: 'Tài liệu chứa vết sửa đổi (tracked changes); văn bản đã được trích xuất theo trạng thái hiển thị hiện tại.',
    severity: 'info',
  },
  HEADERS_FOOTERS_OMITTED: {
    label: 'Đầu trang/Chân trang đã lược bỏ',
    description: 'Nội dung đầu trang (header) và chân trang (footer) đã được tự động bỏ qua để tập trung vào phần thân bài viết.',
    severity: 'info',
  },
  COMMENTS_OMITTED: {
    label: 'Nhận xét/Bình luận đã lược bỏ',
    description: 'Các bình luận, ghi chú bên lề tài liệu DOCX đã được lược bỏ.',
    severity: 'info',
  },
  FOOTNOTES_ENDNOTES_OMITTED: {
    label: 'Chú thích cuối trang đã lược bỏ',
    description: 'Các chú thích chân trang (footnote) hoặc cuối tài liệu (endnote) đã được bỏ qua.',
    severity: 'info',
  },
  DRAWING_TEXT_OMITTED: {
    label: 'Văn bản hình vẽ đã lược bỏ',
    description: 'Văn bản nằm trong đối tượng vẽ/khối đồ họa (shapes/drawings) đã được bỏ qua.',
    severity: 'info',
  },
  FIELD_RESULT_REVIEW: {
    label: 'Rà soát trường động DOCX',
    description: 'Tài liệu chứa các trường tự động (fields); kết quả hiển thị được trích xuất cần được kiểm tra lại.',
    severity: 'warning',
  },
  EXTERNAL_LINK_IGNORED: {
    label: 'Liên kết ngoài được giữ nguyên dạng văn bản',
    description: 'Các siêu liên kết ngoài không được tải tự động theo chính sách an toàn thông tin.',
    severity: 'info',
  },
  LOCATOR_REVIEW: {
    label: 'Rà soát chỉ mục vị trí',
    description: 'Vị trí đoạn văn bản có thể đã thay đổi do cấu trúc trích xuất; vui lòng xác minh lại vị trí gốc.',
    severity: 'warning',
  },
  MANUAL_CHUNKING_REQUIRED: {
    label: 'Yêu cầu phân mảnh thủ công',
    description: 'Tài liệu chưa thể tự động phân đoạn tối ưu; vui lòng tự tạo từ 1 đến 20 mảnh tri thức theo hướng dẫn.',
    severity: 'warning',
  },
  EXTRACTION_NOT_EXPERT_REVIEW: {
    label: 'Trích xuất chưa phải là thẩm định',
    description: 'Quá trình trích xuất tự động chỉ phục vụ tạo bản nháp. Mọi nội dung cần được chuyên gia thẩm định trước khi phê duyệt.',
    severity: 'info',
  },
};

export const LOCATOR_STATUS_CONFIG: Record<
  LocatorStatus,
  { label: string; badgeClass: string; icon: string; description: string }
> = {
  EXACT_SPAN: {
    label: 'Khớp chính xác',
    badgeClass: 'bg-teal/15 text-teal border border-teal/40 dark:bg-teal/20 dark:text-teal',
    icon: 'verified',
    description: 'Nội dung và trích dẫn trùng khớp hoàn toàn với vị trí trích xuất trong tài liệu gốc.',
  },
  USER_VERIFIED: {
    label: 'Người dùng đã kiểm chứng',
    badgeClass: 'bg-blue/15 text-blue border border-blue/40 dark:bg-blue/20 dark:text-blue',
    icon: 'fact_check',
    description: 'Người dùng đã tự tay rà soát và xác nhận tính chính xác của trích dẫn và vị trí.',
  },
  UNVERIFIED: {
    label: 'Chưa kiểm chứng / Đã sửa đổi',
    badgeClass: 'bg-amber/15 text-amber border border-amber/40 dark:bg-amber/20 dark:text-amber',
    icon: 'help_outline',
    description: 'Nội dung đã được biên tập hoặc vị trí trích dẫn chưa được kiểm chứng lại với tài liệu gốc.',
  },
};
