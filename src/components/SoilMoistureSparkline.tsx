import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { MetricStatus, TrendPoint } from '../types/overview';
import { formatTimeHHmm } from '../utils/metricLabels';

interface SoilMoistureSparklineProps {
  data: (TrendPoint | number)[] | TrendPoint[] | number[];
  targetMin: number | null;
  targetMax: number | null;
  status: MetricStatus;
  unit?: string;
}

interface NormalizedPoint {
  t: string | null;
  v: number | null;
  index: number;
}

export default function SoilMoistureSparkline({
  data,
  targetMin,
  targetMax,
  status,
  unit = '%',
}: SoilMoistureSparklineProps) {
  useLanguage();

  if (!data || !Array.isArray(data) || data.length < 2) {
    return null;
  }

  // Normalize points safely whether passed as TrendPoint or raw number
  const totalCount = data.length;
  const normalized: NormalizedPoint[] = data.map((item, index) => {
    if (typeof item === 'number') {
      return { t: null, v: item, index };
    }
    if (item && typeof item === 'object') {
      return {
        t: typeof item.t === 'string' ? item.t : null,
        v: typeof item.v === 'number' && !isNaN(item.v) ? item.v : null,
        index,
      };
    }
    return { t: null, v: null, index };
  });

  const validPoints = normalized.filter((p): p is NormalizedPoint & { v: number } => p.v !== null);
  if (validPoints.length < 2) {
    return null;
  }

  const width = 260;
  const height = 48;
  const paddingTop = 6;
  const paddingBottom = 6;
  const paddingLeft = 4;
  const paddingRight = 4;

  const numericValues = validPoints.map((p) => p.v);
  const minVal = Math.min(...numericValues);
  const maxVal = Math.max(...numericValues);

  // Establish bounds ensuring targetMin and targetMax are visible within the frame
  const boundedMin = targetMin !== null ? Math.min(minVal, targetMin) : minVal;
  const boundedMax = targetMax !== null ? Math.max(maxVal, targetMax) : maxVal;
  const yMinVal = boundedMin - 3;
  const yMaxVal = boundedMax + 3;
  const range = Math.max(yMaxVal - yMinVal, 1);

  const getX = (index: number) =>
    paddingLeft + (index / (totalCount - 1)) * (width - paddingLeft - paddingRight);

  const getY = (val: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    return height - paddingBottom - ((val - yMinVal) / range) * usableHeight;
  };

  // Build SVG path segments handling missing points gracefully
  let pathD = '';
  let inSegment = false;

  for (let i = 0; i < normalized.length; i++) {
    const pt = normalized[i];
    if (pt.v !== null) {
      const x = getX(i).toFixed(1);
      const y = getY(pt.v).toFixed(1);
      if (!inSegment) {
        pathD += `${pathD ? ' ' : ''}M ${x},${y}`;
        inSegment = true;
      } else {
        pathD += ` L ${x},${y}`;
      }
    } else {
      inSegment = false;
    }
  }

  // Target band coordinates
  const hasBand = targetMin !== null && targetMax !== null;
  const bandTop = hasBand ? Math.min(getY(targetMax!), getY(targetMin!)) : 0;
  const bandBottom = hasBand ? Math.max(getY(targetMax!), getY(targetMin!)) : 0;
  const bandHeight = Math.max(bandBottom - bandTop, 2);

  // Status color class
  const colorClass =
    status === 'NORMAL'
      ? 'text-teal'
      : status === 'LOW'
        ? 'text-amber'
        : status === 'HIGH' || status === 'SENSOR_ERROR'
          ? 'text-coral'
          : 'text-gray';

  const lastValid = validPoints[validPoints.length - 1];
  const lastX = getX(lastValid.index);
  const lastY = getY(lastValid.v);

  // Time range labels if timestamps exist
  const firstWithTime = normalized.find((p) => p.t);
  const lastWithTime = [...normalized].reverse().find((p) => p.t);
  const timeRangeLabel =
    firstWithTime && lastWithTime && firstWithTime.t !== lastWithTime.t
      ? `${formatTimeHHmm(firstWithTime.t)} – ${formatTimeHHmm(lastWithTime.t)}`
      : null;

  return (
    <div className="mt-3 pt-2.5 border-t border-border/50">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-gray font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-teal">show_chart</span>
          {t('Xu hướng ẩm đất')}
        </span>
        <div className="flex items-center gap-2">
          {hasBand && (
            <span className="text-gray text-[10px]">
              {t('Dải mục tiêu:')} {targetMin}–{targetMax}{unit}
            </span>
          )}
          <span className={`font-bold ${colorClass}`}>
            {Number.isInteger(lastValid.v) ? lastValid.v : lastValid.v.toFixed(1)}
            {unit}
          </span>
        </div>
      </div>

      <div className="w-full relative overflow-hidden rounded-lg bg-bg/50 border border-border/40 p-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-11 overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Target Min / Max Band */}
          {hasBand && (
            <>
              <rect
                x={paddingLeft}
                y={bandTop}
                width={width - paddingLeft - paddingRight}
                height={bandHeight}
                fill="currentColor"
                fillOpacity="0.12"
                className="text-teal"
                rx="2"
              />
              <line
                x1={paddingLeft}
                y1={bandTop}
                x2={width - paddingRight}
                y2={bandTop}
                stroke="currentColor"
                strokeDasharray="3 2"
                strokeOpacity="0.4"
                strokeWidth="1"
                className="text-teal"
              />
              <line
                x1={paddingLeft}
                y1={bandBottom}
                x2={width - paddingRight}
                y2={bandBottom}
                stroke="currentColor"
                strokeDasharray="3 2"
                strokeOpacity="0.4"
                strokeWidth="1"
                className="text-teal"
              />
            </>
          )}

          {/* Sparkline curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={colorClass}
            />
          )}

          {/* Last reading point pulse */}
          <circle
            cx={lastX}
            cy={lastY}
            r="4.5"
            fill="currentColor"
            fillOpacity="0.25"
            className={colorClass}
          />
          <circle
            cx={lastX}
            cy={lastY}
            r="2.5"
            fill="currentColor"
            className={colorClass}
          />
        </svg>
      </div>

      {timeRangeLabel && (
        <div className="flex justify-between items-center text-[10px] text-gray mt-1 px-1">
          <span>{formatTimeHHmm(firstWithTime?.t)}</span>
          <span className="text-[9px] text-gray/80">{t('Khoảng đo')}</span>
          <span>{formatTimeHHmm(lastWithTime?.t)}</span>
        </div>
      )}
    </div>
  );
}
