import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { getFarms } from '../api/farms';
import { getFarmLayout, saveFarmLayout } from '../api/farmVisual';
import type { Farm } from '../types/farm';
import type { LayoutView, PlacementItem, SaveLayoutRequest, MutationReceipt } from '../types/farmVisual';
import { isValidDecimalVersion } from '../types/farmVisual';
import type { Zone } from '../types/zone';

if (typeof window !== 'undefined') {
  (window as unknown as { __FARM_VISUAL__?: { isValidDecimalVersion: typeof isValidDecimalVersion } }).__FARM_VISUAL__ = {
    isValidDecimalVersion,
  };
}
import FarmLayoutCanvas from '../components/farmVisual/FarmLayoutCanvas';
import FarmZoneInspector from '../components/farmVisual/FarmZoneInspector';
import FarmLayoutEditorToolbar from '../components/farmVisual/FarmLayoutEditorToolbar';
import UnplacedZonesDrawer from '../components/farmVisual/UnplacedZonesDrawer';
import ZoneCreateModal from '../components/farmVisual/ZoneCreateModal';
import ZoneEditModal from '../components/farmVisual/ZoneEditModal';
import SourceStreamDrawer from '../components/farmVisual/SourceStreamDrawer';
import LayoutConflictModal from '../components/farmVisual/LayoutConflictModal';
import UnsavedChangesModal from '../components/farmVisual/UnsavedChangesModal';
import ZoneManagementList from '../components/ZoneManagementList';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ZoneManagementPage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const isOwner = user?.role === 'OWNER';
  const ownerFarmId = user?.farmId ?? null;

  // Farm selection
  const rawParamFarmId = params.get('farmId');
  const parsedFarmId = rawParamFarmId ? parseInt(rawParamFarmId, 10) : null;
  const isForeignOwner = isOwner && parsedFarmId !== null && ownerFarmId !== null && parsedFarmId !== ownerFarmId;

  const initialFarmId = isForeignOwner
    ? null
    : isOwner
    ? ownerFarmId
    : Number.isSafeInteger(parsedFarmId) && parsedFarmId! > 0
    ? parsedFarmId
    : null;

  const [activeFarmId, setActiveFarmId] = useState<number | null>(initialFarmId);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(false);

  // Layout & Zone Data State
  const [layout, setLayout] = useState<LayoutView | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [layoutError, setLayoutError] = useState<{ status?: number; code?: string; message: string } | null>(
    isForeignOwner
      ? {
          status: 403,
          code: 'FORBIDDEN_FOREIGN_FARM',
          message: 'Bạn không có quyền truy cập sơ đồ của nông trại khác.',
        }
      : null
  );

  // Tab: 'canvas' (Sơ đồ) vs 'list' (Danh sách)
  const [activeTab, setActiveTab] = useState<'canvas' | 'list'>('canvas');

  // Selected Zone for Inspector
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftItems, setDraftItems] = useState<PlacementItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmittingLayout, setIsSubmittingLayout] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);
  const [zoneForSource, setZoneForSource] = useState<Zone | null>(null);

  // Target-bound pending operations by Farm ID
  interface PendingLayoutRecord {
    targetFarmId: number;
    operationId: string;
    body: SaveLayoutRequest;
    generation: number;
    status: 'IN_FLIGHT' | 'UNCERTAIN' | 'CONFLICT';
    errorCode?: string;
    errorMessage?: string;
  }

  // Recovery & Conflict Modals
  const [conflictModalState, setConflictModalState] = useState<{
    isOpen: boolean;
    type: '409_CONFLICT' | 'TIMEOUT_UNCERTAINTY';
    farmId: number;
    operationId: string | null;
    errorCode?: string;
    errorMessage?: string;
  }>({
    isOpen: false,
    type: '409_CONFLICT',
    farmId: 1,
    operationId: null,
  });

  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  // Target-bound pending operations by Farm ID
  const [pendingOperationsByFarm, setPendingOperationsByFarm] = useState<Record<number, PendingLayoutRecord>>({});
  const activeFarmIdRef = useRef<number | null>(activeFarmId);
  activeFarmIdRef.current = activeFarmId;

  // Monotonic session refs to avoid race conditions when switching farms
  const farmSessionRef = useRef(0);
  // Active save operation tracking (R2-F1: decouple save write-lock from read generations)
  const activeSaveOperationIdRef = useRef<string | null>(null);

  // Load Farms (ADMIN only)
  useEffect(() => {
    if (isOwner) {
      if (ownerFarmId) setActiveFarmId(ownerFarmId);
      return;
    }

    setLoadingFarms(true);
    getFarms()
      .then(farmList => {
        setFarms(farmList);
        if (!activeFarmId && farmList.length > 0) {
          const firstId = farmList[0].id;
          setActiveFarmId(firstId);
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('farmId', String(firstId));
            return next;
          }, { replace: true });
        }
      })
      .catch(() => {
        // Failed to load farms
      })
      .finally(() => {
        setLoadingFarms(false);
      });
  }, [isOwner, ownerFarmId]);

  // Handle URL param changes (Fencing foreign farms for OWNER)
  useEffect(() => {
    if (isOwner) {
      if (parsedFarmId && ownerFarmId && parsedFarmId !== ownerFarmId) {
        // OWNER attempting to access foreign farm: Denied
        setLayoutError({
          status: 403,
          code: 'FORBIDDEN_FOREIGN_FARM',
          message: t('Bạn không có quyền truy cập sơ đồ của nông trại khác.'),
        });
        setLayout(null);
        setActiveFarmId(null);
        return;
      }
      if (ownerFarmId) {
        setActiveFarmId(ownerFarmId);
      }
      return;
    }

    if (parsedFarmId && parsedFarmId !== activeFarmId) {
      setActiveFarmId(parsedFarmId);
    }
  }, [parsedFarmId, isOwner, ownerFarmId, activeFarmId, t]);

  // Load Layout for Active Farm
  const loadLayout = useCallback(async (farmId: number) => {
    if (isOwner && ownerFarmId && farmId !== ownerFarmId) {
      setLayoutError({
        status: 403,
        code: 'FORBIDDEN_FOREIGN_FARM',
        message: t('Bạn không có quyền truy cập sơ đồ của nông trại khác.'),
      });
      setLayout(null);
      return;
    }

    const currentSession = ++farmSessionRef.current;
    setLoadingLayout(true);
    setLayoutError(null);

    try {
      const data = await getFarmLayout(farmId);
      if (farmSessionRef.current !== currentSession) return;

      setLayout(data);
      setDraftItems(data.items);
      setHasUnsavedChanges(false);

      // Select first zone by default if available
      if (data.zones && data.zones.length > 0) {
        setSelectedZoneId(prev => (prev && data.zones.some(z => z.id === prev) ? prev : data.zones[0].id));
      } else {
        setSelectedZoneId(null);
      }
    } catch (err: unknown) {
      if (farmSessionRef.current !== currentSession) return;

      const res = (err as { response?: { status?: number; data?: { code?: string; message?: string; error?: string } } })?.response;
      const status = res?.status;
      const code = res?.data?.code || res?.data?.error;
      const message =
        res?.data?.message ||
        (status === 503
          ? t('Tính năng sơ đồ vườn chưa sẵn sàng hoặc đang bảo trì (HTTP 503 FV_DISABLED).')
          : status === 403
          ? t('Bạn không có quyền truy cập vào cấu hình sơ đồ của nông trại này.')
          : t('Không thể tải sơ đồ vườn. Vui lòng kiểm tra lại kết nối.'));

      setLayoutError({ status, code, message });
      setLayout(null);
    } finally {
      if (farmSessionRef.current === currentSession) {
        setLoadingLayout(false);
      }
    }
  }, [isOwner, ownerFarmId, t]);

  useEffect(() => {
    if (activeFarmId) {
      loadLayout(activeFarmId);
    }
  }, [activeFarmId, loadLayout]);

  // Farm Picker Change Handler (ADMIN)
  const handleFarmChange = (newFarmId: number) => {
    if (hasUnsavedChanges) {
      setIsUnsavedModalOpen(true);
      return;
    }
    farmSessionRef.current++; // Increment generation on selection change to retire old callbacks
    activeSaveOperationIdRef.current = null;
    setIsSubmittingLayout(false);
    setActiveFarmId(newFarmId);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('farmId', String(newFarmId));
      return next;
    }, { replace: true });
  };

  // Switch to Edit Mode
  const handleEnterEditMode = () => {
    if (!layout) return;
    setIsEditMode(true);
    setDraftItems([...layout.items]);
    setHasUnsavedChanges(false);
  };

  // Update placement during edit mode
  const handleUpdatePlacement = (updatedItem: PlacementItem) => {
    setDraftItems(prev => {
      const idx = prev.findIndex(i => i.zoneId === updatedItem.zoneId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedItem;
        return next;
      }
      return [...prev, updatedItem];
    });
    setHasUnsavedChanges(true);
  };

  // Remove placement from canvas (moves to unplacedZoneIds without deleting the Zone)
  const handleRemovePlacement = (zoneId: number) => {
    setDraftItems(prev => prev.filter(i => i.zoneId !== zoneId));
    setHasUnsavedChanges(true);
  };

  // Place an unplaced zone onto the canvas
  const handlePlaceZone = (zoneId: number) => {
    const existingCount = draftItems.length;
    const defaultX = Math.min(8000, 1000 + (existingCount % 4) * 2000);
    const defaultY = Math.min(8000, 1000 + Math.floor(existingCount / 4) * 2000);

    const newItem: PlacementItem = {
      zoneId,
      x: defaultX,
      y: defaultY,
      width: 1800,
      height: 1400,
      zIndex: existingCount,
    };

    setDraftItems(prev => [...prev, newItem]);
    setSelectedZoneId(zoneId);
    setHasUnsavedChanges(true);
  };

  // Save Layout Snapshot with Optimistic Locking & UUID Idempotency
  const handleSaveLayout = async () => {
    if (!layout || !activeFarmId || isSubmittingLayout) return;

    // F2 / R1: If an uncertain operation is already pending on activeFarmId, DO NOT generate a new UUID!
    const existingPending = pendingOperationsByFarm[activeFarmId];
    if (existingPending && existingPending.status === 'UNCERTAIN') {
      setConflictModalState({
        isOpen: true,
        type: 'TIMEOUT_UNCERTAINTY',
        farmId: activeFarmId,
        operationId: existingPending.operationId,
        errorCode: existingPending.errorCode,
        errorMessage: existingPending.errorMessage,
      });
      return;
    }

    const targetFarmId = activeFarmId;
    const currentSession = farmSessionRef.current;
    const operationId = generateUUID();
    activeSaveOperationIdRef.current = operationId;

    const requestBody: SaveLayoutRequest = {
      operationId,
      expectedVersion: layout.version,
      expectedZoneCatalogHash: layout.zoneCatalogHash,
      items: draftItems,
    };

    const newPendingRecord: PendingLayoutRecord = {
      targetFarmId,
      operationId,
      body: requestBody,
      generation: currentSession,
      status: 'IN_FLIGHT',
    };

    setPendingOperationsByFarm(prev => ({
      ...prev,
      [targetFarmId]: newPendingRecord,
    }));

    setIsSubmittingLayout(true);

    try {
      await saveFarmLayout(targetFarmId, requestBody);

      // Clear pending record for targetFarmId
      setPendingOperationsByFarm(prev => {
        const next = { ...prev };
        delete next[targetFarmId];
        return next;
      });

      // R2-F1: Only update UI and call loadLayout if this save operation is still active and target matches
      if (activeSaveOperationIdRef.current === operationId && activeFarmIdRef.current === targetFarmId) {
        setIsEditMode(false);
        setHasUnsavedChanges(false);
        await loadLayout(targetFarmId);
      }
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { code?: string; message?: string } } })?.response;
      const status = res?.status;
      const code = res?.data?.code;
      const message = res?.data?.message;
      const isConflict = status === 409;

      setPendingOperationsByFarm(prev => ({
        ...prev,
        [targetFarmId]: {
          ...newPendingRecord,
          status: isConflict ? 'CONFLICT' : 'UNCERTAIN',
          errorCode: code,
          errorMessage: message,
        },
      }));

      // R2-F1: Only open modal if this save operation is still active and target matches
      if (activeSaveOperationIdRef.current === operationId && activeFarmIdRef.current === targetFarmId) {
        setConflictModalState({
          isOpen: true,
          type: isConflict ? '409_CONFLICT' : 'TIMEOUT_UNCERTAINTY',
          farmId: targetFarmId,
          operationId,
          errorCode: code,
          errorMessage: message,
        });
      }
    } finally {
      // R2-F1: Release save lock independently of read generations (farmSessionRef increments during loadLayout)
      if (activeSaveOperationIdRef.current === operationId) {
        activeSaveOperationIdRef.current = null;
        setIsSubmittingLayout(false);
      }
    }
  };

  // Retry saving the same operation body with the exact same UUID
  const handleRetrySameOperation = async (targetFarmId: number) => {
    const op = pendingOperationsByFarm[targetFarmId];
    if (!op) return;

    const retryOperationId = op.operationId;
    activeSaveOperationIdRef.current = retryOperationId;
    setConflictModalState(prev => ({ ...prev, isOpen: false }));
    setIsSubmittingLayout(true);

    try {
      await saveFarmLayout(targetFarmId, op.body);

      setPendingOperationsByFarm(prev => {
        const next = { ...prev };
        delete next[targetFarmId];
        return next;
      });

      // R2-F1: Release/reload when retry is current
      if (activeSaveOperationIdRef.current === retryOperationId && activeFarmIdRef.current === targetFarmId) {
        setIsEditMode(false);
        setHasUnsavedChanges(false);
        await loadLayout(targetFarmId);
      }
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { code?: string; message?: string } } })?.response;
      const status = res?.status;
      const code = res?.data?.code;
      const message = res?.data?.message;

      if (activeSaveOperationIdRef.current === retryOperationId && activeFarmIdRef.current === targetFarmId) {
        setConflictModalState({
          isOpen: true,
          type: status === 409 ? '409_CONFLICT' : 'TIMEOUT_UNCERTAINTY',
          farmId: targetFarmId,
          operationId: op.operationId,
          errorCode: code,
          errorMessage: message,
        });
      }
    } finally {
      // R2-F1: Release save lock independently of read generations
      if (activeSaveOperationIdRef.current === retryOperationId) {
        activeSaveOperationIdRef.current = null;
        setIsSubmittingLayout(false);
      }
    }
  };

  // Reload latest data after 409 Conflict (Preserves draft)
  const handleReloadLatestAfterConflict = async (targetFarmId: number) => {
    setConflictModalState(prev => ({ ...prev, isOpen: false }));
    try {
      const freshLayout = await getFarmLayout(targetFarmId);
      if (activeFarmIdRef.current !== targetFarmId) return;

      // Update remote layout & tokens
      setLayout(freshLayout);
      // NOTE (F5 / R2): Do NOT overwrite draftItems! Retain draft coordinates.
      setHasUnsavedChanges(true);

      // Clear the conflict pending op
      setPendingOperationsByFarm(prev => {
        const next = { ...prev };
        delete next[targetFarmId];
        return next;
      });
    } catch {
      // Retain conflict state
    }
  };

  // When a verified receipt is confirmed from operation readback
  const handleVerifiedReceipt = async (_receipt: MutationReceipt, targetFarmId: number) => {
    setConflictModalState(prev => ({ ...prev, isOpen: false }));
    setPendingOperationsByFarm(prev => {
      const next = { ...prev };
      delete next[targetFarmId];
      return next;
    });

    if (activeFarmIdRef.current === targetFarmId) {
      setIsEditMode(false);
      setHasUnsavedChanges(false);
      await loadLayout(targetFarmId);
    }
  };

  // Cancel Edit Mode
  const handleCancelEditMode = () => {
    if (hasUnsavedChanges) {
      setIsUnsavedModalOpen(true);
    } else {
      setIsEditMode(false);
      if (layout) setDraftItems(layout.items);
    }
  };

  const handleDiscardChanges = () => {
    setIsUnsavedModalOpen(false);
    setIsEditMode(false);
    setHasUnsavedChanges(false);
    if (layout) setDraftItems(layout.items);
  };

  // Zone CRUD callbacks
  const handleZoneCreated = (_created: Zone) => {
    setIsCreateModalOpen(false);
    if (activeFarmId) loadLayout(activeFarmId);
  };

  const handleZoneUpdated = (_updated: Zone) => {
    setIsEditModalOpen(false);
    setZoneToEdit(null);
    if (activeFarmId) loadLayout(activeFarmId);
  };

  // Current selected Zone object
  const allZones = layout?.zones || [];
  const selectedZone = allZones.find(z => z.id === selectedZoneId) || null;
  const currentItems = isEditMode ? draftItems : layout?.items || [];
  const selectedItem = currentItems.find(i => i.zoneId === selectedZoneId) || null;

  // Compute unplaced zones
  const placedZoneIds = new Set(currentItems.map(i => i.zoneId));
  const unplacedZones = allZones.filter(z => !placedZoneIds.has(z.id));
  const zonesForList = allZones.map(z => ({
    ...z,
    variety: (z as unknown as { variety?: string | null }).variety ?? null,
  }));

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      {/* ─── Breadcrumb & Header ─── */}
      <div className="flex flex-col gap-1">
        <nav aria-label="Breadcrumb" className="text-xs text-[#64748b] dark:text-slate-400 flex items-center gap-1.5 font-medium">
          <span className="hover:text-[#004489] cursor-pointer" onClick={() => navigate('/')}>
            {t('Trang chủ')}
          </span>
          <span>/</span>
          <span className="text-[#0b1c30] dark:text-slate-200 font-semibold">{t('Quản lý khu vực')}</span>
          <span>/</span>
          <span className="text-[#004489] dark:text-[#60a5fa]">{t('Sơ đồ vườn')}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0b1c30] dark:text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#004489] dark:text-[#60a5fa] text-2xl">yard</span>
              <span>{t('Sơ đồ vườn & Điều phối khu vực')}</span>
            </h1>
            <p className="text-xs md:text-sm text-[#64748b] dark:text-slate-400 mt-0.5">
              {t('Xem và cấu hình phân bố tương đối các khu vực canh tác trên hệ tọa độ nguyên 10.000 điểm.')}
            </p>
          </div>

          {/* Action CTAs (ADMIN Only) */}
          {!isOwner && (
            <div className="flex items-center gap-2.5 shrink-0">
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleEnterEditMode}
                  disabled={!layout || loadingLayout}
                  data-testid="btn-enter-edit-mode"
                  className="h-[44px] min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#004489] dark:text-[#60a5fa] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">format_shapes</span>
                  <span>{t('Chỉnh bố trí')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                disabled={!activeFarmId}
                data-testid="btn-add-zone"
                className="h-[44px] min-h-[44px] px-4 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>{t('Thêm khu vực')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Top Control Bar: Farm Selector & Tabs ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 shadow-xs">
        {/* Left: Farm Picker or Owner Farm Badge */}
        <div className="flex items-center gap-3">
          {isOwner ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <span className="material-symbols-outlined text-base text-amber-600">lock</span>
              <span>{t('Nông trại sở hữu')}: {layout?.farm?.name || `Farm #${ownerFarmId}`}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#0b1c30] dark:text-slate-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-[#004489]">agriculture</span>
                {t('Nông trại')}:
              </span>
              <select
                id="select-farm-picker"
                aria-label={t('Chọn nông trại')}
                value={activeFarmId ?? ''}
                onChange={e => handleFarmChange(Number(e.target.value))}
                disabled={loadingFarms || isEditMode}
                className="h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} (ID: {f.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {layout && (
            <span className="text-xs text-[#64748b] dark:text-slate-400 font-mono hidden md:inline">
              v{layout.version}
            </span>
          )}
        </div>

        {/* Right: Tab Switcher (Sơ đồ / Danh sách) */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-1.5 px-4 h-11 min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'canvas'
                ? 'bg-white dark:bg-slate-700 text-[#004489] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">grid_view</span>
            <span>{t('Sơ đồ')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-4 h-11 min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-700 text-[#004489] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">format_list_bulleted</span>
            <span>{t('Danh sách')} ({allZones.length})</span>
          </button>
        </div>
      </div>

      {/* ─── Edit Mode Toolbar (Mounted only when editing) ─── */}
      {isEditMode && (
        <FarmLayoutEditorToolbar
          selectedItem={selectedItem}
          selectedZone={selectedZone}
          onUpdatePlacement={handleUpdatePlacement}
          onRemovePlacement={handleRemovePlacement}
          onSave={handleSaveLayout}
          onCancel={handleCancelEditMode}
          isSubmitting={isSubmittingLayout}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}

      {/* ─── Error / Loading Panels ─── */}
      {loadingLayout ? (
        <div className="flex flex-col items-center justify-center min-h-[420px] bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center" role="status" aria-busy="true">
          <div className="w-10 h-10 border-3 border-[#004489]/20 border-t-[#004489] rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-[#0b1c30] dark:text-slate-200">{t('Đang tải sơ đồ vườn...')}</p>
        </div>
      ) : layoutError ? (
        <div className="p-6 bg-white dark:bg-[#0f172a] rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xs space-y-3">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <span className="material-symbols-outlined text-2xl">error</span>
            <h3 className="text-sm font-bold">{t('Lỗi truy vấn sơ đồ')} ({layoutError.status || 500})</h3>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{layoutError.message}</p>
          {activeFarmId && (
            <button
              type="button"
              onClick={() => loadLayout(activeFarmId)}
              className="h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              <span>{t('Thử lại')}</span>
            </button>
          )}
        </div>
      ) : layout && allZones.length === 0 ? (
        /* Empty Farm: No Zones Created */
        <div className="flex flex-col items-center justify-center min-h-[380px] bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <span className="material-symbols-outlined text-3xl">dashboard_customize</span>
          </div>
          <h3 className="text-sm font-bold text-[#0b1c30] dark:text-slate-200">
            {t('Vườn chưa có phân khu kỹ thuật')}
          </h3>
          <p className="text-xs text-[#64748b] dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
            {t('Khởi tạo các lô canh tác và định hình vị trí tương đối để bắt đầu nhận luồng đo từ trạm cảm biến.')}
          </p>
          {!isOwner && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-[44px] min-h-[44px] px-5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>{t('Thêm khu vực')}</span>
            </button>
          )}
        </div>
      ) : (
        /* Main View Container */
        <>
          {activeTab === 'canvas' ? (
            <div className="space-y-4">
              {/* Canvas + Inspector Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left 2 Cols: Interactive Canvas */}
                <div className="lg:col-span-2 min-h-[500px]">
                  <FarmLayoutCanvas
                    items={currentItems}
                    zones={allZones}
                    selectedZoneId={selectedZoneId}
                    onSelectZone={setSelectedZoneId}
                    isEditMode={isEditMode}
                    onUpdatePlacement={isEditMode ? handleUpdatePlacement : undefined}
                    onRemovePlacement={isEditMode ? handleRemovePlacement : undefined}
                  />
                </div>

                {/* Right 1 Col: Selected Zone Inspector */}
                <div className="lg:col-span-1">
                  <FarmZoneInspector
                    zone={selectedZone}
                    areaUnit={layout?.areaUnit ?? null}
                    isOwner={isOwner}
                    onEditZone={z => {
                      setZoneToEdit(z);
                      setIsEditModalOpen(true);
                    }}
                    onConfigureSource={z => {
                      setZoneForSource(z);
                      setIsSourceDrawerOpen(true);
                    }}
                  />
                </div>
              </div>

              {/* Unplaced Zones Drawer / Section */}
              <UnplacedZonesDrawer
                unplacedZones={unplacedZones}
                omittedPlacementCount={layout?.omittedPlacementCount ?? 0}
                onPlaceZone={handlePlaceZone}
                isEditMode={isEditMode}
              />
            </div>
          ) : (
            /* Tab 'list': Zone Table Alternative */
            <div className="space-y-3">
              <ZoneManagementList zones={zonesForList} readOnly={isOwner} />
            </div>
          )}
        </>
      )}

      {/* ─── Modals & Drawers ─── */}
      <ZoneCreateModal
        isOpen={isCreateModalOpen}
        farmId={activeFarmId || 1}
        existingCodes={allZones.map(z => z.code)}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleZoneCreated}
      />

      <ZoneEditModal
        isOpen={isEditModalOpen}
        zone={zoneToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setZoneToEdit(null);
        }}
        onSuccess={handleZoneUpdated}
      />

      <SourceStreamDrawer
        isOpen={isSourceDrawerOpen}
        zone={zoneForSource}
        onClose={() => {
          setIsSourceDrawerOpen(false);
          setZoneForSource(null);
        }}
      />

      <LayoutConflictModal
        isOpen={conflictModalState.isOpen}
        type={conflictModalState.type}
        farmId={conflictModalState.farmId}
        operationId={conflictModalState.operationId}
        errorCode={conflictModalState.errorCode}
        errorMessage={conflictModalState.errorMessage}
        onReloadLatest={handleReloadLatestAfterConflict}
        onRetrySameOperation={handleRetrySameOperation}
        onVerifiedReceipt={handleVerifiedReceipt}
        onClose={() => setConflictModalState(prev => ({ ...prev, isOpen: false }))}
      />

      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onContinueEditing={() => setIsUnsavedModalOpen(false)}
        onDiscardChanges={handleDiscardChanges}
      />
    </div>
  );
}
