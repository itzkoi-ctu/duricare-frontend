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

/**
 * Formats an ISO-8601 date string to DD/MM/YYYY HH:mm in Asia/Ho_Chi_Minh timezone.
 * Used for operational alert timestamps matching the approved Stitch reference.
 */
export function formatAlertDateTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const find = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${find('day')}/${find('month')}/${find('year')} ${find('hour')}:${find('minute')}`;
}
