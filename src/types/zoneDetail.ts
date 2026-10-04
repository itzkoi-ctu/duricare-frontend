import type { MetricData } from './overview';
import type { MetricKey } from '../utils/metricLabels';

export type ReadingPeriod = 'TODAY' | 'LAST_24_HOURS' | 'LAST_7_DAYS';
export interface ReadingRange { from: string; to: string }
export interface MetricChipProps {
  metricKey: MetricKey;
  metric: MetricData;
  variant?: 'card' | 'detail';
}
