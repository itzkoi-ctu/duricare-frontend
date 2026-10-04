import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { WeatherOverview } from '../types/overview';
import { getWeatherInfo } from '../utils/weatherLabels';
import { formatTimeHHmm } from '../utils/metricLabels';

interface ForecastPanelProps {
  weather?: WeatherOverview | null;
}

export default function ForecastPanel({ weather }: ForecastPanelProps) {
  useLanguage();
  if (!weather) {
    return null;
  }

  const info = getWeatherInfo(weather.weatherCode);

  // Derive agricultural recommendation based on expected rainfall
  const getAgriAdvisory = (rainMm: number) => {
    if (rainMm >= 25) {
      return {
        level: 'warning',
        badge: t("Cảnh báo mưa lớn"),
        badgeBg: 'bg-coral/15 text-coral border-coral/30',
        text: t("Dự báo mưa lớn trong 48 giờ tới (≥25mm). Khuyến nghị: Tạm ngưng chu kỳ tưới, chủ động khơi thông rãnh mương thoát nước trên liếp để phòng ngừa ngập úng rễ sầu riêng."),
      };
    }
    if (rainMm >= 5) {
      return {
        level: 'caution',
        badge: t("Mưa rải rác"),
        badgeBg: 'bg-amber/15 text-amber border-amber/30',
        text: t("Dự báo có mưa rải rác trong 48h tới. Khuyến nghị: Giảm lưu lượng tưới 40–50%, kiểm tra độ ẩm đất trước khi vận hành hệ thống cấp nước."),
      };
    }
    return {
      level: 'normal',
      badge: t("Thời tiết ổn định"),
      badgeBg: 'bg-teal/15 text-teal border-teal/30',
      text: t("Lượng mưa dự kiến thấp (<5mm), thời tiết thuận lợi. Khuyến nghị: Duy trì chế độ tưới giữ ẩm tầng rễ theo khuyến nghị từng giai đoạn sinh trưởng."),
    };
  };

  const advisory = getAgriAdvisory(weather.expectedRainMm48h);
  const fetchedTime = weather.fetchedAt ? formatTimeHHmm(weather.fetchedAt) : '--:--';

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 md:p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">
                partly_cloudy_day
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text"> {t("Dự báo thời tiết 48 giờ tới")} </h3>
                <span className="px-2 py-0.5 rounded-full bg-bg border border-border text-[11px] font-semibold text-text">
                  {info.label}
                </span>
              </div>
              <p className="text-xs text-gray mt-0.5">
                {weather.source} {t("• Cập nhật lúc")} {fetchedTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${advisory.badgeBg}`}
            >
              {advisory.badge}
            </span>
          </div>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          {/* 1. Expected Rain */}
          <div className="p-3 rounded-xl bg-bg border border-border/60 flex flex-col">
            <span className="text-[11px] font-medium text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-teal">
                water_drop
              </span> {t("Lượng mưa 48h")} </span>
            <span className="text-xl font-extrabold text-text mt-1">
              {weather.expectedRainMm48h} mm
            </span>
            <span className="text-[10px] text-gray mt-0.5">
              {weather.expectedRainMm48h >= 25 ? t("Mưa nhiều") : t("Mức an toàn")}
            </span>
          </div>

          {/* 2. Precip Probability */}
          <div className="p-3 rounded-xl bg-bg border border-border/60 flex flex-col">
            <span className="text-[11px] font-medium text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-blue">
                rainy
              </span> {t("Xác suất mưa ngày")} </span>
            <span className="text-xl font-extrabold text-text mt-1">
              {weather.precipitationProbabilityToday}%
            </span>
            <span className="text-[10px] text-gray mt-0.5">{t("Hôm nay")}</span>
          </div>

          {/* 3. Temperature */}
          <div className="p-3 rounded-xl bg-bg border border-border/60 flex flex-col">
            <span className="text-[11px] font-medium text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-coral">
                thermostat
              </span> {t("Nhiệt độ hiện tại")} </span>
            <span className="text-xl font-extrabold text-text mt-1">
              {weather.temperature}°C
            </span>
            <span className="text-[10px] text-gray mt-0.5">{t("Thực tế trạm đo")}</span>
          </div>

          {/* 4. Air Humidity */}
          <div className="p-3 rounded-xl bg-bg border border-border/60 flex flex-col">
            <span className="text-[11px] font-medium text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-teal">
                air
              </span> {t("Độ ẩm không khí")} </span>
            <span className="text-xl font-extrabold text-text mt-1">
              {weather.humidity}%
            </span>
            <span className="text-[10px] text-gray mt-0.5">{t("Khí quyển xung quanh")}</span>
          </div>
        </div>

        {/* 48h Timeline projection pills */}
        <div className="grid grid-cols-3 gap-2.5 my-3 text-xs">
          <div className="p-2.5 rounded-xl bg-bg/70 border border-border/50 text-center">
            <span className="text-gray text-[10px] block font-medium">{t("Hôm nay")}</span>
            <span className="material-symbols-outlined text-[18px] text-amber my-0.5">
              wb_sunny
            </span>
            <span className="font-bold text-text block">28°–34°C</span>
            <span className="text-[10px] text-gray">{t("Mưa")} {weather.precipitationProbabilityToday}%</span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg/70 border border-border/50 text-center">
            <span className="text-gray text-[10px] block font-medium">{t("Ngày mai")}</span>
            <span className="material-symbols-outlined text-[18px] text-teal my-0.5">
              partly_cloudy_day
            </span>
            <span className="font-bold text-text block">26°–32°C</span>
            <span className="text-[10px] text-gray">{t("Mưa")} {Math.min(weather.precipitationProbabilityToday + 10, 90)}%</span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg/70 border border-border/50 text-center">
            <span className="text-gray text-[10px] block font-medium">{t("48h tới")}</span>
            <span className="material-symbols-outlined text-[18px] text-blue my-0.5">
              rainy
            </span>
            <span className="font-bold text-text block">25°–31°C</span>
            <span className="text-[10px] text-gray">{t("Dự kiến")} {weather.expectedRainMm48h}mm</span>
          </div>
        </div>
      </div>

      {/* Agricultural Recommendation Banner */}
      <div className="mt-2 p-3.5 rounded-xl bg-bg border border-border/80 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-teal shrink-0 mt-0.5">
          agriculture
        </span>
        <div className="text-xs">
          <span className="font-bold text-text block mb-0.5">{t("Khuyến nghị nông vụ:")}</span>
          <p className="text-gray leading-relaxed">{advisory.text}</p>
        </div>
      </div>
    </div>
  );
}
