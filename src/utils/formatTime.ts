/**
 * Formats an ISO-8601 date string into a Vietnamese relative time string.
 * e.g., "2 giờ trước", "15 phút trước", "3 ngày trước", "vừa xong"
 */
export function formatRelativeTime(dateInput: string | Date, nowInput?: Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = nowInput ?? new Date();

  if (isNaN(date.getTime())) {
    return 'Thời gian không hợp lệ';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 30) {
    return 'vừa xong';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} ngày trước`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} tháng trước`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} năm trước`;
}
