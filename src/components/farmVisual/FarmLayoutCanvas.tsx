import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { PlacementItem } from '../../types/farmVisual';
import type { Zone } from '../../types/zone';
import { t } from '../../i18n';

interface FarmLayoutCanvasProps {
  items: PlacementItem[];
  zones: Zone[];
  selectedZoneId: number | null;
  onSelectZone: (zoneId: number) => void;
  isEditMode: boolean;
  onUpdatePlacement?: (updated: PlacementItem) => void;
  onRemovePlacement?: (zoneId: number) => void;
}

const EXTENT = 10000;

export default function FarmLayoutCanvas({
  items,
  zones,
  selectedZoneId,
  onSelectZone,
  isEditMode,
  onUpdatePlacement,
  onRemovePlacement,
}: FarmLayoutCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging / Resizing interaction state
  const [dragState, setDragState] = useState<{
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw';
    zoneId: number;
    initialPointer: { x: number; y: number };
    initialPlacement: PlacementItem;
  } | null>(null);

  const zoneMap = React.useMemo(() => {
    const map = new Map<number, Zone>();
    zones.forEach(z => map.set(z.id, z));
    return map;
  }, [zones]);

  // Handle Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Keyboard navigation for selected zone in edit mode
  useEffect(() => {
    if (!isEditMode || !selectedZoneId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const item = items.find(i => i.zoneId === selectedZoneId);
      if (!item || !onUpdatePlacement) return;

      const step = e.shiftKey ? 200 : 50;
      let nextX = item.x;
      let nextY = item.y;
      let nextW = item.width;
      let nextH = item.height;
      let handled = false;

      if (e.key === 'ArrowLeft') {
        if (e.altKey) {
          nextW = Math.max(100, item.width - step);
        } else {
          nextX = Math.max(0, item.x - step);
        }
        handled = true;
      } else if (e.key === 'ArrowRight') {
        if (e.altKey) {
          nextW = Math.min(EXTENT - item.x, item.width + step);
        } else {
          nextX = Math.min(EXTENT - item.width, item.x + step);
        }
        handled = true;
      } else if (e.key === 'ArrowUp') {
        if (e.altKey) {
          nextH = Math.max(100, item.height - step);
        } else {
          nextY = Math.max(0, item.y - step);
        }
        handled = true;
      } else if (e.key === 'ArrowDown') {
        if (e.altKey) {
          nextH = Math.min(EXTENT - item.y, item.height + step);
        } else {
          nextY = Math.min(EXTENT - item.height, item.y + step);
        }
        handled = true;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (onRemovePlacement) {
          onRemovePlacement(selectedZoneId);
          handled = true;
        }
      }

      if (handled) {
        e.preventDefault();
        onUpdatePlacement({
          ...item,
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextW),
          height: Math.round(nextH),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, selectedZoneId, items, onUpdatePlacement, onRemovePlacement]);

  // Pointer interactions for Move / Resize
  const handlePointerDown = (
    e: React.PointerEvent,
    item: PlacementItem,
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw',
  ) => {
    e.stopPropagation();
    onSelectZone(item.zoneId);

    if (!isEditMode) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      type,
      zoneId: item.zoneId,
      initialPointer: { x: e.clientX, y: e.clientY },
      initialPlacement: { ...item },
    });
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState || !containerRef.current || !onUpdatePlacement) return;

      const rect = containerRef.current.getBoundingClientRect();
      const currentCanvasWidth = rect.width * zoom;
      const currentCanvasHeight = rect.height * zoom;

      // Calculate scale from screen pixels to 10,000 grid units
      const scaleX = EXTENT / currentCanvasWidth;
      const scaleY = EXTENT / currentCanvasHeight;

      const deltaPixelX = e.clientX - dragState.initialPointer.x;
      const deltaPixelY = e.clientY - dragState.initialPointer.y;

      const deltaGridX = Math.round(deltaPixelX * scaleX);
      const deltaGridY = Math.round(deltaPixelY * scaleY);

      const init = dragState.initialPlacement;
      let nextX = init.x;
      let nextY = init.y;
      let nextW = init.width;
      let nextH = init.height;

      if (dragState.type === 'move') {
        nextX = Math.max(0, Math.min(EXTENT - init.width, init.x + deltaGridX));
        nextY = Math.max(0, Math.min(EXTENT - init.height, init.y + deltaGridY));
      } else if (dragState.type === 'se') {
        nextW = Math.max(200, Math.min(EXTENT - init.x, init.width + deltaGridX));
        nextH = Math.max(200, Math.min(EXTENT - init.y, init.height + deltaGridY));
      } else if (dragState.type === 'sw') {
        const potentialX = Math.max(0, Math.min(init.x + init.width - 200, init.x + deltaGridX));
        nextW = init.width + (init.x - potentialX);
        nextX = potentialX;
        nextH = Math.max(200, Math.min(EXTENT - init.y, init.height + deltaGridY));
      } else if (dragState.type === 'ne') {
        nextW = Math.max(200, Math.min(EXTENT - init.x, init.width + deltaGridX));
        const potentialY = Math.max(0, Math.min(init.y + init.height - 200, init.y + deltaGridY));
        nextH = init.height + (init.y - potentialY);
        nextY = potentialY;
      } else if (dragState.type === 'nw') {
        const potentialX = Math.max(0, Math.min(init.x + init.width - 200, init.x + deltaGridX));
        nextW = init.width + (init.x - potentialX);
        nextX = potentialX;

        const potentialY = Math.max(0, Math.min(init.y + init.height - 200, init.y + deltaGridY));
        nextH = init.height + (init.y - potentialY);
        nextY = potentialY;
      }

      onUpdatePlacement({
        ...init,
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextW),
        height: Math.round(nextH),
      });
    },
    [dragState, zoom, onUpdatePlacement],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore pointer release error
        }
        setDragState(null);
      }
    },
    [dragState],
  );

  // Pan interaction on canvas background
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== containerRef.current && (e.target as HTMLElement).id !== 'canvas-grid-bg') {
      return;
    }
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (dragState) {
      handlePointerMove(e);
      return;
    }
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      handlePointerUp(e);
    }
    setIsPanning(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 shadow-sm overflow-hidden select-none">
      {/* Canvas Top Toolbar: Zoom & Fit & Instructions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e2e8f0] dark:border-slate-800 bg-[#f8f9ff] dark:bg-[#1e293b]/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1e293b] dark:text-slate-200">
          <span className="material-symbols-outlined text-[#1f5ca9] dark:text-[#60a5fa] text-base">
            map
          </span>
          <span>{t('Sơ đồ bố trí khu vực canh tác')}</span>
          <span className="text-[11px] font-normal text-[#64748b] dark:text-slate-400">
            ({items.length} {t('khu vực trên sơ đồ')})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label={t('Thu nhỏ')}
            title={t('Thu nhỏ')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-[#64748b] hover:text-[#1e293b] dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
          <span className="font-mono text-xs font-semibold px-1.5 text-[#1e293b] dark:text-slate-200 min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label={t('Phóng to')}
            title={t('Phóng to')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-[#64748b] hover:text-[#1e293b] dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
          <button
            type="button"
            onClick={handleFit}
            aria-label={t('Khớp khung hình (100%)')}
            title={t('Khớp khung hình')}
            className="px-3 h-11 min-h-[44px] rounded-lg border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#64748b] hover:text-[#1e293b] dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">fit_screen</span>
            <span>{t('Khớp')}</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div
        ref={containerRef}
        id="canvas-viewport"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        className="relative flex-1 min-h-[480px] w-full bg-[#f8f9ff] dark:bg-[#0b1329] overflow-hidden cursor-crosshair touch-none"
      >
        {/* Transform Container */}
        <div
          id="canvas-transform-wrapper"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Subtle Grid SVG Background */}
          <svg
            id="canvas-grid-bg"
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="smallGrid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-slate-200 dark:text-slate-800/60"
                />
              </pattern>
              <pattern
                id="grid"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <rect width="100" height="100" fill="url(#smallGrid)" />
                <path
                  d="M 100 0 L 0 0 0 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-slate-300 dark:text-slate-700/70"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Placed Zones */}
          {items.map(item => {
            const zone = zoneMap.get(item.zoneId);
            const isSelected = item.zoneId === selectedZoneId;
            const leftPercent = (item.x / EXTENT) * 100;
            const topPercent = (item.y / EXTENT) * 100;
            const widthPercent = (item.width / EXTENT) * 100;
            const heightPercent = (item.height / EXTENT) * 100;

            return (
              <div
                key={item.zoneId}
                data-zone-id={item.zoneId}
                data-testid={`canvas-zone-${zone?.code || item.zoneId}`}
                tabIndex={0}
                role="button"
                aria-label={`Khu vực ${zone?.code || item.zoneId}: ${zone?.name || ''}`}
                onPointerDown={e => handlePointerDown(e, item, 'move')}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                  zIndex: isSelected ? 200 + item.zIndex : item.zIndex,
                }}
                className={`absolute rounded-xl transition-shadow select-none group focus:outline-none ${
                  isSelected
                    ? 'ring-2 ring-[#004489] dark:ring-[#60a5fa] bg-[#eff4ff]/90 dark:bg-[#1e293b]/95 border-2 border-[#004489] dark:border-[#60a5fa] shadow-lg'
                    : 'bg-white/90 dark:bg-[#1e293b]/90 border border-[#cbd5e1] dark:border-slate-700 hover:border-[#1f5ca9] hover:shadow-md'
                } ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
              >
                {/* Zone Content Container */}
                <div className="flex flex-col h-full p-2.5 overflow-hidden">
                  <div className="flex items-center justify-between gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#004489] text-white dark:bg-[#60a5fa] dark:text-[#0b1c30] shadow-xs">
                      {zone?.code || `Z#${item.zoneId}`}
                    </span>
                    {isEditMode && isSelected && (
                      <span className="text-[10px] font-mono text-[#64748b] dark:text-slate-400">
                        Z:{item.zIndex}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 font-semibold text-xs text-[#0b1c30] dark:text-slate-100 truncate">
                    {zone?.name || t('Chưa đặt tên')}
                  </div>

                  {zone?.soilType && (
                    <div className="mt-0.5 text-[11px] text-[#64748b] dark:text-slate-400 truncate">
                      {zone.soilType}
                    </div>
                  )}

                  {/* Relative Coordinates display */}
                  <div className="mt-auto pt-1 flex items-center justify-between text-[10px] font-mono text-[#64748b] dark:text-slate-400 border-t border-[#e2e8f0]/60 dark:border-slate-700/60">
                    <span>
                      X:{Math.round(leftPercent)}% Y:{Math.round(topPercent)}%
                    </span>
                    <span>
                      {Math.round(widthPercent)}%×{Math.round(heightPercent)}%
                    </span>
                  </div>
                </div>

                {/* Resize Handles (Only in Edit Mode for selected zone) */}
                {isEditMode && isSelected && (
                  <>
                    <div
                      onPointerDown={e => handlePointerDown(e, item, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#004489] rounded-xs cursor-nw-resize shadow-xs"
                    />
                    <div
                      onPointerDown={e => handlePointerDown(e, item, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#004489] rounded-xs cursor-ne-resize shadow-xs"
                    />
                    <div
                      onPointerDown={e => handlePointerDown(e, item, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#004489] rounded-xs cursor-se-resize shadow-xs"
                    />
                    <div
                      onPointerDown={e => handlePointerDown(e, item, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#004489] rounded-xs cursor-sw-resize shadow-xs"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
