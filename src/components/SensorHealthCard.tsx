import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { ZoneOverview } from '../types/overview';

interface SensorHealthCardProps {
  zones: ZoneOverview[];
}

export default function SensorHealthCard({ zones }: SensorHealthCardProps) {
  useLanguage();
  let normal = 0;
  let warning = 0;
  let error = 0;
  let noSignal = 0;
  for (const zone of zones) {
    for (const metric of [zone.metrics.temperature, zone.metrics.humidity, zone.metrics.soilMoisture]) {
      if (metric.status === 'NORMAL') normal++;
      else if (metric.status === 'SENSOR_ERROR') error++;
      else if (metric.status === 'LOW' || metric.status === 'HIGH') warning++;
      else if (metric.status === 'NO_SIGNAL') noSignal++;
    }
  }

  return (
    <section aria-label={t("Tình trạng cảm biến")} className="rounded-2xl bg-surface border border-border p-4 md:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-[18px] text-teal">sensors</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray">{t("Tình trạng cảm biến")}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold" aria-label={t("Phân loại trạng thái cảm biến")}>
          <span className="px-2 py-1 rounded-full bg-teal/10 text-teal">{normal} {t("bình thường")}</span>
          <span className="px-2 py-1 rounded-full bg-coral/10 text-coral">{error} {t("lỗi", [error])}</span>
          <span className="px-2 py-1 rounded-full bg-amber/10 text-amber">{warning} {t("cần chú ý")}</span>
          <span className="px-2 py-1 rounded-full bg-gray/10 text-gray">{noSignal} {t("mất tín hiệu")}</span>
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-gray">
        <span>{normal + warning + error + noSignal} {t("điểm đo được theo dõi", [normal + warning + error + noSignal])}</span>
        <span className="font-medium text-text">{zones.length} {t("khu vực", [zones.length])}</span>
      </div>
    </section>
  );
}
