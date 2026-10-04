import { t, getLocale } from '../i18n';
/**
 * Formats an ISO-8601 date string using the selected language.
 * e.g., "2 giờ trước", "15 phút trước", "3 ngày trước", "vừa xong"
 */
export function formatRelativeTime(dateInput: string | Date, nowInput?: Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = nowInput ?? new Date();

  if (isNaN(date.getTime())) {
    return t("Thời gian không hợp lệ");
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const direction = diffMs < 0 ? 1 : -1;
  const relative = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'always' });

  if (Math.abs(diffSec) < 30) {
    return t("vừa xong");
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return relative.format(direction * diffMin, 'minute');
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return relative.format(direction * diffHours, 'hour');
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return relative.format(direction * diffDays, 'day');
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return relative.format(direction * diffMonths, 'month');
  }

  const diffYears = Math.floor(diffMonths / 12);
  return relative.format(direction * diffYears, 'year');
}
