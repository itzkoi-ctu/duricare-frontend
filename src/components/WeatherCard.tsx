import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { WeatherOverview } from '../types/overview';
import { getWeatherInfo } from '../utils/weatherLabels';
import { formatTimeHHmm } from '../utils/metricLabels';

interface WeatherCardProps {
  weather?: WeatherOverview | null;
}

function formatWeatherFetchedTime(fetchedAt: string | undefined | null): string {
  if (!fetchedAt) return t('Chưa có dữ liệu cập nhật');
  const d = new Date(fetchedAt);
  if (isNaN(d.getTime())) return t('Chưa có dữ liệu cập nhật');

  const now = new Date();
  const timeStr = formatTimeHHmm(fetchedAt);

  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isSameDay) {
    return t('Lấy lúc {0} hôm nay', [timeStr]);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) {
    return t('Lấy lúc {0} hôm qua', [timeStr]);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return t('Lấy lúc {0} ngày {1}/{2}', [timeStr, day, month]);
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  useLanguage();
  if (!weather) {
    return null;
  }

  const info = getWeatherInfo(weather.weatherCode);
  const rainTotal =
    typeof weather.expectedRainMm48h === 'number'
      ? weather.expectedRainMm48h.toFixed(1).replace('.', ',')
      : '--';

  return (
    <section
      data-testid="weather-rail-card"
      className="bg-surface border border-border rounded-xl p-4 shadow-xs space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-2.5 border-b border-border/70">
        <div>
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[#1F5CA9] dark:text-[#60A5FA] text-lg">
              cloud
            </span>
            <h3 className="text-base font-semibold text-text">{t('Thời tiết')}</h3>
          </div>
          <span className="text-[11px] text-gray block mt-0.5">
            {t('Dữ liệu mô hình')} · {weather.source || 'Open-Meteo'}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#1F5CA9]/10 text-[#1F5CA9] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA] flex items-center justify-center">
          <span className="material-symbols-outlined text-xl">{info.icon}</span>
        </div>
      </div>

      {/* 2 Metrics: Temperature & Humidity */}
      <div className="grid grid-cols-2 gap-3 my-2">
        <div className="p-2.5 rounded-lg bg-bg border border-border/80">
          <span className="text-xs text-gray block mb-0.5">{t('Nhiệt độ vườn')}</span>
          <span className="text-2xl font-bold text-text tabular-nums leading-tight">
            {weather.temperature}°C
          </span>
          <span className="text-[11px] text-gray block mt-0.5">{info.label}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-bg border border-border/80">
          <span className="text-xs text-gray block mb-0.5">{t('Độ ẩm khí quyển')}</span>
          <span className="text-2xl font-bold text-text tabular-nums leading-tight">
            {weather.humidity}%
          </span>
          <span className="text-[11px] text-gray block mt-0.5">
            {weather.precipitationProbabilityToday > 0
              ? `${t('Xác suất mưa')}: ${weather.precipitationProbabilityToday}%`
              : t('Không mưa')}
          </span>
        </div>
      </div>

      {/* Legacy Aggregate Rainfall Tile */}
      <div className="p-3 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sky-950 dark:text-sky-200">
            {t('Tổng lượng mưa dự báo hai ngày lịch')}
          </span>
          <span aria-hidden="true" className="material-symbols-outlined text-[#0072A8] dark:text-[#38BDF8] text-base">
            rainy
          </span>
        </div>
        <div className="text-2xl font-bold text-[#0072A8] dark:text-[#38BDF8] tabular-nums mt-1">
          {rainTotal} mm
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray pt-2 border-t border-border/60">
        <span>{formatWeatherFetchedTime(weather.fetchedAt)}</span>
      </div>
    </section>
  );
}
