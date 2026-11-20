import type { Zone } from '../../types/zone';
import { t } from '../../i18n';

interface UnplacedZonesDrawerProps {
  unplacedZones: Zone[];
  omittedPlacementCount: number;
  onPlaceZone: (zoneId: number) => void;
  isEditMode: boolean;
}

export default function UnplacedZonesDrawer({
  unplacedZones,
  omittedPlacementCount,
  onPlaceZone,
  isEditMode,
}: UnplacedZonesDrawerProps) {
  if (unplacedZones.length === 0 && omittedPlacementCount === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-[#e2e8f0] dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-lg">
            pending_actions
          </span>
          <h3 className="text-xs font-bold text-[#0b1c30] dark:text-slate-100">
            {t('Khu vực chưa đặt trên sơ đồ')}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[11px] font-semibold">
            {unplacedZones.length}
          </span>
        </div>

        {omittedPlacementCount > 0 && (
          <span className="text-[11px] text-[#64748b] dark:text-slate-400">
            ({omittedPlacementCount} {t('vị trí cũ đã bị lược bỏ')})
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {unplacedZones.map(zone => (
          <div
            key={zone.id}
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[#0b1c30] dark:text-slate-200">
                  {zone.code}
                </span>
                <span className="text-xs font-semibold text-[#0b1c30] dark:text-slate-100 truncate">
                  {zone.name || t('Chưa đặt tên')}
                </span>
              </div>
              {zone.soilType && (
                <div className="text-[11px] text-[#64748b] dark:text-slate-400 truncate mt-0.5">
                  {zone.soilType}
                </div>
              )}
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={() => onPlaceZone(zone.id)}
                className="h-11 min-h-[44px] px-3.5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-semibold shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
                title={t('Đặt khu vực này vào sơ đồ')}
              >
                <span className="material-symbols-outlined text-sm">add_location</span>
                <span>{t('Đặt')}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
