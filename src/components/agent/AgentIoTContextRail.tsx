import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/useLanguage';
import { t, getLocale } from '../../i18n';
import { useOverviewContext } from '../../context/OverviewContext';
import { getWeatherInfo } from '../../utils/weatherLabels';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../../types/zone';

export interface AgentIoTContextRailProps {
  zoneCode?: string;
  onSelectZone?: (code: string) => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export default function AgentIoTContextRail({
  zoneCode,
  onSelectZone,
  onClose,
  isDrawer = false,
}: AgentIoTContextRailProps) {
  useLanguage();
  const { data } = useOverviewContext();

  const zones = data?.zones ?? [];
  const activeZone = (zoneCode ? zones.find(z => z.code === zoneCode) : null) ?? zones[0];
  const weather = data?.weather;
  const weatherInfo = weather ? getWeatherInfo(weather.weatherCode) : null;

  const tempVal = activeZone?.metrics?.temperature?.value ?? null;
  const humVal = activeZone?.metrics?.humidity?.value ?? null;
  const soilVal = activeZone?.metrics?.soilMoisture?.value ?? null;

  const tempTarget = activeZone?.metrics?.temperature;
  const humTarget = activeZone?.metrics?.humidity;
  const soilTarget = activeZone?.metrics?.soilMoisture;

  const isOffline = activeZone?.metrics?.soilMoisture?.status === 'NO_SIGNAL' ||
    (tempVal === null && humVal === null && soilVal === null);

  const isSoilAlert = activeZone?.metrics?.soilMoisture?.status === 'LOW' ||
    activeZone?.metrics?.soilMoisture?.status === 'HIGH' ||
    activeZone?.metrics?.soilMoisture?.status === 'SENSOR_ERROR';

  const stageLabel = activeZone?.growthStage && activeZone.growthStage in GROWTH_STAGE_LABELS
    ? t(GROWTH_STAGE_LABELS[activeZone.growthStage as GrowthStage])
    : (activeZone?.growthStage || t('Chưa cập nhật'));

  const getSoilStatusText = () => {
    if (!activeZone) return t('Chưa có dữ liệu');
    switch (activeZone.metrics?.soilMoisture?.status) {
      case 'LOW':
        return t('Thấp hơn tối ưu');
      case 'HIGH':
        return t('Cao hơn tối ưu');
      case 'NORMAL':
        return t('Đạt tối ưu');
      case 'NO_SIGNAL':
        return t('Mất tín hiệu');
      default:
        return t('Chưa xác định');
    }
  };

  const getRecordedTime = () => {
    const raw = activeZone?.metrics?.soilMoisture?.recordedAt ?? activeZone?.metrics?.temperature?.recordedAt;
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const recordedTime = getRecordedTime();

  return (
    <aside
      aria-label={t("Ngữ cảnh trạm đo")}
      data-testid="agent-iot-context-rail"
      className={`w-full h-full flex flex-col gap-3 p-3.5 bg-surface overflow-y-auto ${
        isDrawer ? 'max-w-full' : ''
      }`}
    >
      {/* ─── Rail Header ─── */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[22px] text-teal shrink-0">sensors</span>
          <h2 className="text-sm font-bold text-text truncate">{t("Ngữ cảnh trạm đo")}</h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
            isOffline ? 'bg-amber/15 text-amber' : 'bg-teal/15 text-teal'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber' : 'bg-teal animate-pulse'}`} />
            {isOffline ? t("Mất tín hiệu") : t("Trực tuyến")}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("Đóng")}
              title={t("Đóng")}
              className="p-1 rounded-lg text-gray hover:text-text hover:bg-border/40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Zone Selector (if multiple zones available) ─── */}
      {zones.length > 1 && (
        <div className="space-y-1">
          <label htmlFor="agent-zone-select" className="text-[10px] uppercase font-bold tracking-wider text-gray">
            {t("Khu vực theo dõi")}
          </label>
          <select
            id="agent-zone-select"
            value={activeZone?.code ?? ''}
            onChange={e => onSelectZone?.(e.target.value)}
            className="w-full text-xs font-semibold bg-bg border border-border/80 rounded-xl px-2.5 py-2 text-text focus:outline-none focus:ring-1 focus:ring-navy"
          >
            {zones.map(z => (
              <option key={z.code} value={z.code}>
                {z.name ? `${z.name} (${z.code})` : z.code}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ─── Card 1: Realtime Sensor Metrics ─── */}
      <div className="rounded-xl border border-border/70 bg-bg p-3 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray">
            {t("Chỉ số cảm biến tức thời")}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-teal">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            {recordedTime ? `${t("Cập nhật")} ${recordedTime}` : t("Thời gian thực")}
          </span>
        </div>

        {/* 2-Column Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {/* Air Temp */}
          <div className="p-2.5 rounded-lg bg-surface border border-border/60 flex flex-col">
            <span className="text-[11px] text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-amber">thermostat</span>
              {t("Nhiệt độ khí")}
            </span>
            <span className="text-base font-bold text-text mt-0.5">
              {tempVal !== null ? `${tempVal}°C` : '--'}
            </span>
            <span className="text-[10px] text-gray mt-0.5 truncate">
              {tempTarget?.targetMin != null && tempTarget?.targetMax != null
                ? `${tempTarget.targetMin}–${tempTarget.targetMax}°C`
                : t("Mục tiêu 24–30°C")}
            </span>
          </div>

          {/* Air Humidity */}
          <div className="p-2.5 rounded-lg bg-surface border border-border/60 flex flex-col">
            <span className="text-[11px] text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-teal">humidity_percentage</span>
              {t("Độ ẩm khí")}
            </span>
            <span className="text-base font-bold text-text mt-0.5">
              {humVal !== null ? `${humVal}%` : '--'}
            </span>
            <span className="text-[10px] text-gray mt-0.5 truncate">
              {humTarget?.targetMin != null && humTarget?.targetMax != null
                ? `${humTarget.targetMin}–${humTarget.targetMax}%`
                : t("Mục tiêu 75–85%")}
            </span>
          </div>
        </div>

        {/* Topsoil Moisture Gauge */}
        <div className="p-2.5 rounded-lg bg-surface border border-border/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-navy dark:text-blue">water_drop</span>
              {t("Độ ẩm tầng đất mặt")}
            </span>
            <span className={`text-xs font-bold ${isSoilAlert ? 'text-coral' : 'text-text'}`}>
              {soilVal !== null ? `${soilVal}%` : '--'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden relative flex">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isSoilAlert ? 'bg-coral' : 'bg-teal'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, soilVal ?? 0))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray">
            <span className={isSoilAlert ? 'text-coral font-medium' : ''}>
              {getSoilStatusText()}
            </span>
            <span>
              {soilTarget?.targetMin != null && soilTarget?.targetMax != null
                ? `${t("Mục tiêu")}: ${soilTarget.targetMin}–${soilTarget.targetMax}%`
                : t("Mục tiêu: 60–80%")}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Card 2: Micro-climate 48h Forecast ─── */}
      {weather && (
        <div className="rounded-xl border border-border/70 bg-bg p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray">
              {t("Dự báo vi khí hậu 48h")}
            </span>
            <span className="material-symbols-outlined text-navy dark:text-blue text-[16px]">
              {weatherInfo?.icon ?? 'partly_cloudy_day'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface border border-border/60">
            <div className="w-10 h-10 rounded-lg bg-navy/10 dark:bg-blue/15 flex items-center justify-center text-navy dark:text-blue shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                {weatherInfo?.icon ?? 'partly_cloudy_day'}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-text">{weather.temperature}°C</span>
                <span className="text-xs font-semibold text-navy dark:text-blue truncate">
                  {weatherInfo?.label ?? t("Thời tiết ổn định")}
                </span>
              </div>
              <span className="text-[11px] text-gray truncate">
                {t("Mưa:")} <strong>{weather.precipitationProbabilityToday}%</strong> • <strong>{weather.expectedRainMm48h} mm</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray px-0.5">
            <span>{weather.source ? t("Nguồn: {0}", [weather.source]) : t("Trạm thời tiết")}</span>
            <span>{t("• Cần Thơ")}</span>
          </div>
        </div>
      )}

      {/* ─── Card 3: Agronomic Species Profile ─── */}
      <div className="rounded-xl border border-border/70 bg-bg p-3 space-y-2 shadow-2xs">
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray">
          {t("Hồ sơ nông vụ khu vực")}
        </span>
        <div className="space-y-1.5 p-2.5 rounded-lg bg-surface border border-border/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray">{t("Giống sầu riêng")}:</span>
            <span className="font-semibold text-text">{activeZone?.variety || 'Ri6'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray">{t("Giai đoạn")}:</span>
            <span className="font-semibold text-navy dark:text-blue">{stageLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray">{t("Khoảng ẩm tối ưu")}:</span>
            <span className="font-semibold text-text">
              {soilTarget?.targetMin != null && soilTarget?.targetMax != null
                ? `${soilTarget.targetMin}% – ${soilTarget.targetMax}%`
                : '60% – 80%'}
            </span>
          </div>
          {activeZone?.soilProfile?.ph?.value != null && (
            <div className="flex items-center justify-between">
              <span className="text-gray">pH {t("đất")}:</span>
              <span className="font-semibold text-text">{activeZone.soilProfile.ph.value}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Action: Link to Sensor Visualizer ─── */}
      {activeZone?.code && (
        <Link
          to={`/zones/${activeZone.code}`}
          className="mt-auto flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy dark:text-blue hover:bg-border/30 transition-all shadow-2xs"
        >
          <span>{t("Xem biểu đồ phân tích cảm biến")}</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      )}
    </aside>
  );
}
