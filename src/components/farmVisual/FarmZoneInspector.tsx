import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Zone } from '../../types/zone';
import type { SensorReading } from '../../types/sensor';
import { getLatestReading } from '../../api/zones';
import { t } from '../../i18n';

interface FarmZoneInspectorProps {
  zone: Zone | null;
  areaUnit: string | null;
  isOwner: boolean;
  onEditZone: (zone: Zone) => void;
  onConfigureSource: (zone: Zone) => void;
}

export default function FarmZoneInspector({
  zone,
  isOwner,
  onEditZone,
  onConfigureSource,
}: FarmZoneInspectorProps) {
  const [tempReading, setTempReading] = useState<SensorReading | null>(null);
  const [humidityReading, setHumidityReading] = useState<SensorReading | null>(null);
  const [moistureReading, setMoistureReading] = useState<SensorReading | null>(null);
  const [loadingReadings, setLoadingReadings] = useState(false);

  const fetchSessionRef = useRef(0);

  useEffect(() => {
    if (!zone) {
      setTempReading(null);
      setHumidityReading(null);
      setMoistureReading(null);
      return;
    }

    const currentSession = ++fetchSessionRef.current;
    setLoadingReadings(true);

    Promise.allSettled([
      getLatestReading(zone.code, 'TEMPERATURE'),
      getLatestReading(zone.code, 'HUMIDITY'),
      getLatestReading(zone.code, 'SOIL_MOISTURE'),
    ]).then(results => {
      if (fetchSessionRef.current !== currentSession) return;

      const [tempRes, humidRes, moistRes] = results;
      setTempReading(tempRes.status === 'fulfilled' ? tempRes.value : null);
      setHumidityReading(humidRes.status === 'fulfilled' ? humidRes.value : null);
      setMoistureReading(moistRes.status === 'fulfilled' ? moistRes.value : null);
      setLoadingReadings(false);
    });
  }, [zone]);

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 text-center h-full min-h-[360px]">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <span className="material-symbols-outlined text-2xl">touch_app</span>
        </div>
        <h3 className="text-sm font-semibold text-[#1e293b] dark:text-slate-200">
          {t('Chưa chọn khu vực')}
        </h3>
        <p className="text-xs text-[#64748b] dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
          {t('Nhấp chọn một lô khu vực trên sơ đồ hoặc danh sách để xem thông số kỹ thuật và luồng telemetry.')}
        </p>
      </div>
    );
  }

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 shadow-sm p-5 space-y-4">
      {/* Zone Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e2e8f0] dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#004489] text-white dark:bg-[#60a5fa] dark:text-[#0b1c30]">
              {zone.code}
            </span>
            <span className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
              {zone.name || t('Chưa đặt tên')}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748b] dark:text-slate-400">
            {zone.soilType && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">terrain</span>
                {zone.soilType}
              </span>
            )}
            {zone.area !== null && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">square_foot</span>
                {zone.area} <span className="text-[11px] text-[#64748b]">({t('Đơn vị chưa xác nhận')})</span>
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            {t('Chỉ xem (Owner)')}
          </span>
        )}
      </div>

      {/* Telemetry Sensor Readings */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#1e293b] dark:text-slate-200">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-[#1f5ca9]">sensors</span>
            {t('Số đo cảm biến gần nhất')}
          </span>
          {loadingReadings && (
            <span className="text-[11px] font-normal text-[#64748b] animate-pulse">
              {t('Đang nạp...')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Temperature */}
          <div className="p-2.5 rounded-xl border border-[#e2e8f0] dark:border-slate-800 bg-[#f8f9ff] dark:bg-slate-800/50">
            <div className="text-[11px] text-[#64748b] dark:text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-amber-500">thermostat</span>
              {t('Nhiệt độ')}
            </div>
            <div className="text-sm font-bold text-[#0b1c30] dark:text-slate-100 mt-1">
              {tempReading ? `${tempReading.value}°C` : '—'}
            </div>
            {tempReading && (
              <div className="text-[10px] text-[#64748b] truncate mt-0.5" title={tempReading.recordAt}>
                {formatTimestamp(tempReading.recordAt)}
              </div>
            )}
          </div>

          {/* Humidity */}
          <div className="p-2.5 rounded-xl border border-[#e2e8f0] dark:border-slate-800 bg-[#f8f9ff] dark:bg-slate-800/50">
            <div className="text-[11px] text-[#64748b] dark:text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-blue-500">water_drop</span>
              {t('Độ ẩm KK')}
            </div>
            <div className="text-sm font-bold text-[#0b1c30] dark:text-slate-100 mt-1">
              {humidityReading ? `${humidityReading.value}%` : '—'}
            </div>
            {humidityReading && (
              <div className="text-[10px] text-[#64748b] truncate mt-0.5" title={humidityReading.recordAt}>
                {formatTimestamp(humidityReading.recordAt)}
              </div>
            )}
          </div>

          {/* Soil Moisture */}
          <div className="p-2.5 rounded-xl border border-[#e2e8f0] dark:border-slate-800 bg-[#f8f9ff] dark:bg-slate-800/50">
            <div className="text-[11px] text-[#64748b] dark:text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-emerald-500">grass</span>
              {t('Độ ẩm đất')}
            </div>
            <div className="text-sm font-bold text-[#0b1c30] dark:text-slate-100 mt-1">
              {moistureReading ? `${moistureReading.value}%` : '—'}
            </div>
            {moistureReading && (
              <div className="text-[10px] text-[#64748b] truncate mt-0.5" title={moistureReading.recordAt}>
                {formatTimestamp(moistureReading.recordAt)}
              </div>
            )}
          </div>
        </div>

        {!tempReading && !humidityReading && !moistureReading && !loadingReadings && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-[#e2e8f0] dark:border-slate-700 rounded-lg flex items-start gap-2.5 text-xs text-[#64748b]">
            <span className="material-symbols-outlined text-slate-400 text-base mt-0.5">hourglass_empty</span>
            <div>
              <div className="font-semibold text-[#1e293b] dark:text-slate-200">
                {t('Chưa ghi nhận bản tin telemetry')}
              </div>
              <p className="mt-0.5 leading-relaxed">
                {t('Chưa có số đo gửi lên từ trạm cảm biến thực địa. Dữ liệu trung thực không tạo giả lập.')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons in Exact Hierarchy: Primary, Secondary, Tertiary */}
      <div className="pt-2 flex flex-col gap-2">
        {/* 1. Primary CTA: Xem chi tiết */}
        <Link
          to={`/zones/${encodeURIComponent(zone.code)}`}
          className="w-full h-[44px] min-h-[44px] px-4 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-base">visibility</span>
          <span>{t('Xem chi tiết khu vực')}</span>
        </Link>

        {/* 2. Secondary CTA: Sửa thông tin khu vực (ADMIN only) */}
        {!isOwner && (
          <button
            type="button"
            onClick={() => onEditZone(zone)}
            className="w-full h-[44px] min-h-[44px] px-4 rounded-xl bg-white dark:bg-slate-800 border border-[#cbd5e1] dark:border-slate-700 text-[#0b1c30] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            <span>{t('Sửa thông tin khu vực')}</span>
          </button>
        )}

        {/* 3. Tertiary CTA: Cấu hình nguồn nhận dữ liệu (ADMIN only) */}
        {!isOwner && (
          <button
            type="button"
            onClick={() => onConfigureSource(zone)}
            className="w-full h-[44px] min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#004489] dark:text-[#60a5fa] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">settings_input_component</span>
            <span>{t('Cấu hình nguồn nhận dữ liệu')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
