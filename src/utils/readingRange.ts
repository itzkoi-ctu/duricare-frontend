import type { ReadingPeriod, ReadingRange } from '../types/zoneDetail';

export function getReadingRange(period: ReadingPeriod, now = new Date()): ReadingRange {
  const start = new Date(now);
  if (period === 'TODAY') start.setHours(0, 0, 0, 0);
  else start.setTime(now.getTime() - (period === 'LAST_24_HOURS' ? 24 : 7 * 24) * 60 * 60 * 1000);
  return { from: start.toISOString(), to: now.toISOString() };
}
