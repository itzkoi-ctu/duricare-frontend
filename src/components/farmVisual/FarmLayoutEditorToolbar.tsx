import type { PlacementItem } from '../../types/farmVisual';
import type { Zone } from '../../types/zone';
import { t } from '../../i18n';

interface FarmLayoutEditorToolbarProps {
  selectedItem: PlacementItem | null;
  selectedZone: Zone | null;
  onUpdatePlacement: (updated: PlacementItem) => void;
  onRemovePlacement: (zoneId: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hasUnsavedChanges: boolean;
}

const EXTENT = 10000;

export default function FarmLayoutEditorToolbar({
  selectedItem,
  selectedZone,
  onUpdatePlacement,
  onRemovePlacement,
  onSave,
  onCancel,
  isSubmitting,
  hasUnsavedChanges,
}: FarmLayoutEditorToolbarProps) {
  const handleCoordinateChange = (
    field: keyof PlacementItem,
    rawValue: string,
  ) => {
    if (!selectedItem) return;
    const num = parseInt(rawValue, 10);
    if (isNaN(num)) return;

    const next = { ...selectedItem };

    if (field === 'x') {
      next.x = Math.max(0, Math.min(EXTENT - next.width, num));
    } else if (field === 'y') {
      next.y = Math.max(0, Math.min(EXTENT - next.height, num));
    } else if (field === 'width') {
      next.width = Math.max(100, Math.min(EXTENT - next.x, num));
    } else if (field === 'height') {
      next.height = Math.max(100, Math.min(EXTENT - next.y, num));
    } else if (field === 'zIndex') {
      next.zIndex = Math.max(0, Math.min(199, num));
    }

    onUpdatePlacement(next);
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-xs">
      {/* Left: Mode Title & Selected Zone Badge */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold shadow-xs">
          <span className="material-symbols-outlined text-sm">edit_location</span>
          <span>{t('Chế độ chỉnh sửa bố trí')}</span>
        </span>

        {selectedZone && selectedItem ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <span>{t('Đang chọn:')}</span>
            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-[#004489] dark:text-[#60a5fa]">
              {selectedZone.code}
            </span>
            <span className="truncate max-w-[140px]">{selectedZone.name}</span>
          </div>
        ) : (
          <span className="text-xs text-amber-800 dark:text-amber-300">
            {t('Chọn một khu vực trên sơ đồ để điều chỉnh tọa độ')}
          </span>
        )}
      </div>

      {/* Middle: Coordinate Inputs (Numeric Alternative to Drag) */}
      {selectedItem && (
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="font-mono font-bold text-slate-500">X:</span>
            <input
              type="number"
              data-testid="input-coord-x"
              min={0}
              max={EXTENT - selectedItem.width}
              step={50}
              value={selectedItem.x}
              onChange={e => handleCoordinateChange('x', e.target.value)}
              className="w-20 h-11 min-h-[44px] px-2 font-mono text-center text-base bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>

          <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="font-mono font-bold text-slate-500">Y:</span>
            <input
              type="number"
              data-testid="input-coord-y"
              min={0}
              max={EXTENT - selectedItem.height}
              step={50}
              value={selectedItem.y}
              onChange={e => handleCoordinateChange('y', e.target.value)}
              className="w-20 h-11 min-h-[44px] px-2 font-mono text-center text-base bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>

          <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="font-mono font-bold text-slate-500">W:</span>
            <input
              type="number"
              data-testid="input-coord-w"
              min={100}
              max={EXTENT - selectedItem.x}
              step={50}
              value={selectedItem.width}
              onChange={e => handleCoordinateChange('width', e.target.value)}
              className="w-20 h-11 min-h-[44px] px-2 font-mono text-center text-base bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>

          <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="font-mono font-bold text-slate-500">H:</span>
            <input
              type="number"
              data-testid="input-coord-h"
              min={100}
              max={EXTENT - selectedItem.y}
              step={50}
              value={selectedItem.height}
              onChange={e => handleCoordinateChange('height', e.target.value)}
              className="w-20 h-11 min-h-[44px] px-2 font-mono text-center text-base bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>

          <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="font-mono font-bold text-slate-500">Z:</span>
            <input
              type="number"
              data-testid="input-coord-z"
              min={0}
              max={199}
              step={1}
              value={selectedItem.zIndex}
              onChange={e => handleCoordinateChange('zIndex', e.target.value)}
              className="w-16 h-11 min-h-[44px] px-2 font-mono text-center text-base bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>

          <button
            type="button"
            onClick={() => onRemovePlacement(selectedItem.zoneId)}
            title={t('Bỏ khỏi sơ đồ (Chuyển thành chưa đặt)')}
            className="h-11 min-h-[44px] px-3.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">remove_circle_outline</span>
            <span>{t('Bỏ khỏi sơ đồ')}</span>
          </button>
        </div>
      )}

      {/* Right: Cancel & Save CTAs */}
      <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-[44px] min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#1e293b] dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">close</span>
          <span>{t('Hủy')}</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting || !hasUnsavedChanges}
          data-testid="btn-save-layout"
          className="h-[44px] min-h-[44px] px-5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('Đang lưu...')}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">save</span>
              <span>{t('Lưu bố trí')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
