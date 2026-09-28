import type { MetricStatus } from '../types/overview';

interface SoilMoistureSparklineProps {
  data: number[];
  targetMin: number | null;
  targetMax: number | null;
  status: MetricStatus;
  unit?: string;
}

export default function SoilMoistureSparkline({
  data,
  targetMin,
  targetMax,
  status,
  unit = '%',
}: SoilMoistureSparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const width = 260;
  const height = 48;
  const paddingTop = 6;
  const paddingBottom = 6;
  const paddingLeft = 4;
  const paddingRight = 4;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);

  // Establish bounds ensuring targetMin and targetMax are visible within the frame
  const boundedMin = targetMin !== null ? Math.min(minVal, targetMin) : minVal;
  const boundedMax = targetMax !== null ? Math.max(maxVal, targetMax) : maxVal;
  const yMinVal = boundedMin - 3;
  const yMaxVal = boundedMax + 3;
  const range = Math.max(yMaxVal - yMinVal, 1);

  const getX = (i: number) =>
    paddingLeft + (i / (data.length - 1)) * (width - paddingLeft - paddingRight);

  const getY = (val: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    return height - paddingBottom - ((val - yMinVal) / range) * usableHeight;
  };

  const points = data.map((val, i) => ({ x: getX(i), y: getY(val) }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

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

  const lastVal = data[data.length - 1];
  const lastPoint = points[points.length - 1];

  return (
    <div className="mt-3 pt-2.5 border-t border-border/50">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-gray font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-teal">show_chart</span>
          Xu hướng ẩm đất
        </span>
        <div className="flex items-center gap-2">
          {hasBand && (
            <span className="text-gray text-[10px]">
              Dải mục tiêu: {targetMin}–{targetMax}{unit}
            </span>
          )}
          <span className={`font-bold ${colorClass}`}>
            {lastVal}
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
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={colorClass}
          />

          {/* Last reading point pulse */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="4.5"
            fill="currentColor"
            fillOpacity="0.25"
            className={colorClass}
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="2.5"
            fill="currentColor"
            className={colorClass}
          />
        </svg>
      </div>
    </div>
  );
}
