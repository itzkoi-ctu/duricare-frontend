import type { WeatherOverview } from '../types/overview';
import { getWeatherInfo } from '../utils/weatherLabels';

interface WeatherCardProps {
  weather?: WeatherOverview | null;
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  if (!weather) {
    return null;
  }

  const info = getWeatherInfo(weather.weatherCode);

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 md:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-amber">
              {info.icon}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray">
              Thời tiết thực địa
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bg border border-border text-text">
            {info.label}
          </span>
        </div>

        {/* Main Temperature & Weather Info */}
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-extrabold text-text tracking-tight">
              {weather.temperature}°C
            </span>
            <span className="text-xs text-gray font-medium">Cần Thơ</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray block">Độ ẩm KK</span>
            <span className="text-sm font-bold text-text">{weather.humidity}%</span>
          </div>
        </div>

        {/* Rain indicators grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 p-2 rounded-xl bg-bg border border-border/60 text-xs">
          <div>
            <span className="text-gray text-[10px] block">Xác suất mưa ngày</span>
            <span className="font-semibold text-text flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px] text-blue">rainy</span>
              {weather.precipitationProbabilityToday}%
            </span>
          </div>
          <div>
            <span className="text-gray text-[10px] block">Lượng mưa 48h tới</span>
            <span className="font-semibold text-text flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px] text-teal">water_drop</span>
              {weather.expectedRainMm48h} mm
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-gray">
        <span className="truncate max-w-[140px]">{weather.source}</span>
        <span className="text-teal font-medium">Trực tiếp</span>
      </div>
    </div>
  );
}
