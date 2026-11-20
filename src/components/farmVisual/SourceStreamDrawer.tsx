import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Zone } from '../../types/zone';
import type { SensorMetadata } from '../../types/sensor';
import { ALL_SENSOR_TYPES } from '../../types/sensor';
import type {
  StreamDiscovery,
  AssignmentResponse,
  AssignmentRequest,
  ProviderDiscovery,
  RoutingContract,
} from '../../types/farmVisual';
import {
  getSourceStreams,
  getSourceStreamDetail,
  getSourceRoutingContract,
  getSourceProviders,
  assignSourceStream,
  retireCurrentAssignment,
  getZoneSources,
} from '../../api/farmVisual';
import { getSensors } from '../../api/zones';
import { t } from '../../i18n';

interface SourceStreamDrawerProps {
  isOpen: boolean;
  zone: Zone | null;
  onClose: () => void;
}

export default function SourceStreamDrawer({
  isOpen,
  zone,
  onClose,
}: SourceStreamDrawerProps) {
  const [sensors, setSensors] = useState<SensorMetadata[]>([]);
  const [sources, setSources] = useState<AssignmentResponse[]>([]);
  const [availableStreams, setAvailableStreams] = useState<StreamDiscovery[]>([]);
  const [providers, setProviders] = useState<ProviderDiscovery[]>([]);
  const [routingContract, setRoutingContract] = useState<RoutingContract | null>(null);
  const [nextAfterId, setNextAfterId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [sensorTypeFilter, setSensorTypeFilter] = useState<string>('ALL');

  // F1: Independent loading and error states for each domain
  const [sensorsLoading, setSensorsLoading] = useState(false);
  const [sensorsError, setSensorsError] = useState<string | null>(null);

  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [isMetadataDisabled, setIsMetadataDisabled] = useState(false);

  // Assignment Modal / Form State
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [chosenStreamDetail, setChosenStreamDetail] = useState<StreamDiscovery | null>(null);
  const [reason, setReason] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const SENSOR_TYPE_LABELS: Record<string, string> = {
    TEMPERATURE: 'Nhiệt độ (TEMPERATURE)',
    HUMIDITY: 'Độ ẩm không khí (HUMIDITY)',
    SOIL_MOISTURE: 'Độ ẩm đất (SOIL_MOISTURE)',
    SOIL_PH: 'pH đất (SOIL_PH)',
    SOIL_EC: 'EC đất (SOIL_EC)',
    SOIL_N: 'Nitơ đất (SOIL_N)',
    SOIL_P: 'Photpho đất (SOIL_P)',
    SOIL_K: 'Kali đất (SOIL_K)',
    BATTERY_VOLTAGE: 'Điện áp pin (BATTERY_VOLTAGE)',
  };

  // R3-F1: Live references to prevent stale render closure races
  const latestIsOpenRef = useRef(isOpen);
  latestIsOpenRef.current = isOpen;

  const latestZoneCodeRef = useRef(zone?.code);
  latestZoneCodeRef.current = zone?.code;

  const drawerScopeSessionRef = useRef(0);
  const sensorRequestTokenRef = useRef(0);
  const sourcesRequestTokenRef = useRef(0);
  const registryRequestTokenRef = useRef(0);
  const selectStreamSessionRef = useRef(0);
  const isSubmittingAssignmentRef = useRef(false);
  const confirmationTokenRef = useRef(0);
  const activeConfirmationTokenRef = useRef<number | null>(null);
  const paginationSessionRef = useRef(0);

  const latestSelectedStreamIdRef = useRef<number | null>(null);
  const latestSelectedSensorIdRef = useRef<number | null>(null);

  const changeSelectedStream = (id: number | null) => {
    latestSelectedStreamIdRef.current = id;
    confirmationTokenRef.current++;
    // R4-F1: Explicit target change disowns prior pending confirmation and clears busy state
    activeConfirmationTokenRef.current = null;
    isSubmittingAssignmentRef.current = false;
    setSubmittingAssignment(false);
    setSelectedStreamId(id);
  };

  const changeSelectedSensor = (id: number | null) => {
    latestSelectedSensorIdRef.current = id;
    confirmationTokenRef.current++;
    // R4-F1: Explicit target change disowns prior pending confirmation and clears busy state
    activeConfirmationTokenRef.current = null;
    isSubmittingAssignmentRef.current = false;
    setSubmittingAssignment(false);
    setSelectedSensorId(id);
  };

  // F1 & R1: Scoped loaders preserving independent success results with domain token fences
  const loadSensors = async (
    zoneCode: string,
    drawerSession = drawerScopeSessionRef.current,
  ) => {
    const token = ++sensorRequestTokenRef.current;
    setSensorsLoading(true);
    setSensorsError(null);
    try {
      const sensorList = await getSensors(zoneCode);
      if (
        drawerScopeSessionRef.current !== drawerSession ||
        !latestIsOpenRef.current ||
        latestZoneCodeRef.current !== zoneCode ||
        sensorRequestTokenRef.current !== token
      ) {
        return;
      }
      setSensors(sensorList);
      if (sensorList.length > 0 && latestSelectedSensorIdRef.current === null) {
        changeSelectedSensor(sensorList[0].id);
      }
    } catch {
      if (
        drawerScopeSessionRef.current !== drawerSession ||
        !latestIsOpenRef.current ||
        latestZoneCodeRef.current !== zoneCode ||
        sensorRequestTokenRef.current !== token
      ) {
        return;
      }
      setSensorsError(t('Không thể tải danh sách cảm biến kỹ thuật.'));
    } finally {
      if (
        drawerScopeSessionRef.current === drawerSession &&
        sensorRequestTokenRef.current === token
      ) {
        setSensorsLoading(false);
      }
    }
  };

  const loadSources = async (
    zoneCode: string,
    drawerSession = drawerScopeSessionRef.current,
  ) => {
    const token = ++sourcesRequestTokenRef.current;
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const sourceList = await getZoneSources(zoneCode);
      if (
        drawerScopeSessionRef.current !== drawerSession ||
        !latestIsOpenRef.current ||
        latestZoneCodeRef.current !== zoneCode ||
        sourcesRequestTokenRef.current !== token
      ) {
        return;
      }
      setSources(sourceList);
    } catch {
      if (
        drawerScopeSessionRef.current !== drawerSession ||
        !latestIsOpenRef.current ||
        latestZoneCodeRef.current !== zoneCode ||
        sourcesRequestTokenRef.current !== token
      ) {
        return;
      }
      setSourcesError(t('Không thể tải thông tin luồng telemetry đã gán.'));
    } finally {
      if (
        drawerScopeSessionRef.current === drawerSession &&
        sourcesRequestTokenRef.current === token
      ) {
        setSourcesLoading(false);
      }
    }
  };

  const loadRegistry = async (
    pFilter = providerFilter,
    sFilter = sensorTypeFilter,
    drawerSession = drawerScopeSessionRef.current,
  ) => {
    const token = ++registryRequestTokenRef.current;
    paginationSessionRef.current++;
    setLoadingMore(false);
    setRegistryLoading(true);
    setRegistryError(null);
    setIsMetadataDisabled(false);

    try {
      const [streamPage, providerPage, contract] = await Promise.all([
        getSourceStreams({
          limit: 50,
          includeRetired: false,
          providerId: pFilter !== 'ALL' ? Number(pFilter) : undefined,
          sensorType: sFilter !== 'ALL' ? sFilter : undefined,
        }),
        getSourceProviders({ limit: 100, includeRetired: false }).catch(() => ({
          items: [],
          page: { limit: 100, nextAfterId: null },
        })),
        getSourceRoutingContract().catch(() => null),
      ]);

      if (
        drawerScopeSessionRef.current !== drawerSession ||
        !latestIsOpenRef.current ||
        registryRequestTokenRef.current !== token
      ) {
        return;
      }

      setAvailableStreams(streamPage.items);
      setNextAfterId(streamPage.page.nextAfterId);
      setProviders(providerPage.items);
      setRoutingContract(contract);
    } catch (err: unknown) {
      if (
        drawerScopeSessionRef.current !== drawerSession ||
        !latestIsOpenRef.current ||
        registryRequestTokenRef.current !== token
      ) {
        return;
      }
      const resData = (err as { response?: { data?: { code?: string; error?: string; message?: string } } })?.response?.data;
      const errorCode = resData?.code || resData?.error;
      const errorMsg = resData?.message || '';
      if (errorCode === 'SOURCE_METADATA_DISABLED' || errorMsg.includes('SOURCE_METADATA_DISABLED')) {
        setIsMetadataDisabled(true);
        setRegistryError(t('Tính năng siêu dữ liệu nguồn nhận (SOURCE_METADATA_DISABLED) đang bị vô hiệu hóa trên máy chủ.'));
      } else {
        setRegistryError(t('Không thể tải danh sách luồng telemetry từ Registry.'));
      }
    } finally {
      if (
        drawerScopeSessionRef.current === drawerSession &&
        registryRequestTokenRef.current === token
      ) {
        setRegistryLoading(false);
      }
    }
  };

  const loadData = async (
    zoneCode: string,
    pFilter = providerFilter,
    sFilter = sensorTypeFilter,
  ) => {
    // New zone or drawer open: increment drawer scope session
    const drawerSession = ++drawerScopeSessionRef.current;
    paginationSessionRef.current++;
    setLoadingMore(false);

    await Promise.allSettled([
      loadSensors(zoneCode, drawerSession),
      loadSources(zoneCode, drawerSession),
      loadRegistry(pFilter, sFilter, drawerSession),
    ]);
  };

  useEffect(() => {
    if (isOpen && zone) {
      paginationSessionRef.current++;
      setLoadingMore(false);
      activeConfirmationTokenRef.current = null;
      isSubmittingAssignmentRef.current = false;
      setIsAssigning(false);
      setSubmittingAssignment(false);
      changeSelectedStream(null);
      setChosenStreamDetail(null);
      setReason('');
      setAssignmentError(null);
      setProviderFilter('ALL');
      setSensorTypeFilter('ALL');
      loadData(zone.code, 'ALL', 'ALL');
    }
  }, [isOpen, zone]);

  // R2-F5, R3-F2: Scope-fenced filter change handler
  const handleFilterChange = (newPFilter: string, newSFilter: string) => {
    // R3-F2: Cancel in-flight pagination from previous filter and reset loadingMore
    paginationSessionRef.current++;
    setLoadingMore(false);
    activeConfirmationTokenRef.current = null;
    isSubmittingAssignmentRef.current = false;
    setSubmittingAssignment(false);

    setProviderFilter(newPFilter);
    setSensorTypeFilter(newSFilter);
    // Invalidate stale stream selections and cursors
    changeSelectedStream(null);
    setChosenStreamDetail(null);
    setAssignmentError(null);
    setAvailableStreams([]);
    setNextAfterId(null);

    if (zone) {
      loadRegistry(newPFilter, newSFilter);
    }
  };

  // R2-F5, R3-F2: Scope-fenced load-more handler with isolated pagination ownership
  const handleLoadMore = async () => {
    if (!nextAfterId || loadingMore) return;
    const paginationSession = ++paginationSessionRef.current;
    const session = drawerScopeSessionRef.current;
    const currentZoneCode = zone?.code;
    setLoadingMore(true);

    try {
      const res = await getSourceStreams({
        limit: 50,
        afterId: nextAfterId,
        includeRetired: false,
        providerId: providerFilter !== 'ALL' ? Number(providerFilter) : undefined,
        sensorType: sensorTypeFilter !== 'ALL' ? sensorTypeFilter : undefined,
      });

      // Discard late pagination if filter, zone, drawer closed, or pagination session superseded
      if (
        paginationSessionRef.current !== paginationSession ||
        drawerScopeSessionRef.current !== session ||
        latestZoneCodeRef.current !== currentZoneCode ||
        !latestIsOpenRef.current
      ) {
        return;
      }

      setAvailableStreams(prev => [...prev, ...res.items]);
      setNextAfterId(res.page.nextAfterId);
    } catch {
      if (
        paginationSessionRef.current === paginationSession &&
        drawerScopeSessionRef.current === session &&
        latestZoneCodeRef.current === currentZoneCode &&
        latestIsOpenRef.current
      ) {
        setAssignmentError(t('Không thể tải thêm danh sách stream.'));
      }
    } finally {
      // R3-F2: Only release lock if this pagination request still owns the current pagination session
      if (paginationSessionRef.current === paginationSession) {
        setLoadingMore(false);
      }
    }
  };

  // When a stream is selected in assignment form, re-check its details
  const handleSelectStream = async (streamId: number) => {
    const session = ++selectStreamSessionRef.current;
    const currentZoneCode = zone?.code;
    changeSelectedStream(streamId);
    setChosenStreamDetail(null);
    setAssignmentError(null);

    try {
      const detail = await getSourceStreamDetail(streamId);
      if (
        selectStreamSessionRef.current !== session ||
        latestZoneCodeRef.current !== currentZoneCode ||
        !latestIsOpenRef.current ||
        latestSelectedStreamIdRef.current !== streamId
      ) {
        return;
      }
      setChosenStreamDetail(detail);
    } catch {
      if (
        selectStreamSessionRef.current !== session ||
        latestZoneCodeRef.current !== currentZoneCode ||
        !latestIsOpenRef.current ||
        latestSelectedStreamIdRef.current !== streamId
      ) {
        return;
      }
      setAssignmentError(t('Không thể đọc chi tiết luồng dữ liệu đã chọn.'));
    }
  };

  // R2-F2, R2-F5, R3-F1: Live identity fenced confirmation & transport determination
  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedStreamId ||
      !selectedSensorId ||
      !chosenStreamDetail ||
      submittingAssignment ||
      isSubmittingAssignmentRef.current
    ) {
      return;
    }

    if (!reason.trim() || reason.trim().length > 1000) {
      setAssignmentError(t('Lý do gán nguồn là bắt buộc và tối đa 1000 ký tự.'));
      return;
    }

    const sensor = sensors.find(s => s.id === selectedSensorId);
    if (!sensor) return;

    const confirmToken = ++confirmationTokenRef.current;
    activeConfirmationTokenRef.current = confirmToken;
    const confirmScope = drawerScopeSessionRef.current;
    const confirmZoneCode = zone?.code;
    const targetStreamId = selectedStreamId;
    const targetSensorId = selectedSensorId;
    const initialChosenVersion = chosenStreamDetail.latestAssignmentVersion;

    isSubmittingAssignmentRef.current = true;
    setSubmittingAssignment(true);
    setAssignmentError(null);

    try {
      // Re-check stream detail right at confirmation time (F7 / R2-F5 / R3-F1)
      const freshDetail = await getSourceStreamDetail(targetStreamId);

      // R3-F1: Live identity & token guard after detail recheck
      if (
        confirmationTokenRef.current !== confirmToken ||
        drawerScopeSessionRef.current !== confirmScope ||
        latestZoneCodeRef.current !== confirmZoneCode ||
        !latestIsOpenRef.current ||
        latestSelectedStreamIdRef.current !== targetStreamId ||
        latestSelectedSensorIdRef.current !== targetSensorId
      ) {
        return;
      }

      if (freshDetail.latestAssignmentVersion !== initialChosenVersion) {
        setChosenStreamDetail(freshDetail);
        setAssignmentError(
          t('Phiên bản của stream đã thay đổi trên máy chủ (v{0}). Vui lòng xác nhận lại.', [
            String(freshDetail.latestAssignmentVersion),
          ]),
        );
        return;
      }

      // R2-F2: Use adapterKind, not acquisition capability, to choose transport.
      // Do NOT treat all non-REGISTRY_ONLY as MQTT.
      // IOTLAB_HTTP is HTTP (not MQTT) -> sending mqttTopic triggers SOURCE_TRANSPORT_MISMATCH.
      const adapterKind = (
        freshDetail.provider?.adapterKind ||
        (freshDetail as { adapterKind?: string }).adapterKind ||
        ''
      ).toUpperCase();

      const isMqttAdapter = adapterKind.includes('MQTT');

      let mqttTopic: string | undefined = undefined;

      if (isMqttAdapter) {
        // If routing contract is unavailable, do NOT silently fall back to durian/...; retain truthful unavailable/retry state
        if (!routingContract) {
          setAssignmentError(
            t('Hợp đồng định tuyến MQTT chưa sẵn sàng hoặc không thể tải từ máy chủ. Vui lòng tải lại hoặc thử lại.'),
          );
          return;
        }

        const ns = routingContract.namespace || 'durian';
        const zCode = routingContract.zoneCaseSensitive ? (zone?.code || 'Z') : (zone?.code || 'Z').toLowerCase();
        const kind = routingContract.messageKind || 'sensors';
        // Compose standard topic from routing-contract fields
        mqttTopic = `${ns}/${zCode}/${kind}`;
      }

      const payload: AssignmentRequest = {
        sensorId: sensor.id,
        expectedVersion: freshDetail.latestAssignmentVersion,
        expectedUnit: sensor.unit,
        expectedExternalSensorId: freshDetail.externalId,
        ...(mqttTopic ? { mqttTopic } : {}),
        reason: reason.trim(),
        reactivatePolling: false, // Default false strictly
      };

      // R3-F1: Live identity & token guard immediately before write
      if (
        confirmationTokenRef.current !== confirmToken ||
        drawerScopeSessionRef.current !== confirmScope ||
        latestZoneCodeRef.current !== confirmZoneCode ||
        !latestIsOpenRef.current ||
        latestSelectedStreamIdRef.current !== targetStreamId ||
        latestSelectedSensorIdRef.current !== targetSensorId
      ) {
        return;
      }

      await assignSourceStream(targetStreamId, payload);

      // R3-F1: Live identity & token guard after assignment write
      if (
        confirmationTokenRef.current !== confirmToken ||
        drawerScopeSessionRef.current !== confirmScope ||
        latestZoneCodeRef.current !== confirmZoneCode ||
        !latestIsOpenRef.current ||
        latestSelectedStreamIdRef.current !== targetStreamId ||
        latestSelectedSensorIdRef.current !== targetSensorId
      ) {
        return;
      }

      changeSelectedStream(null);
      setChosenStreamDetail(null);
      setReason('');
      setIsAssigning(false);
      if (zone) loadSources(zone.code);
    } catch (err: unknown) {
      if (
        confirmationTokenRef.current !== confirmToken ||
        drawerScopeSessionRef.current !== confirmScope ||
        latestZoneCodeRef.current !== confirmZoneCode ||
        !latestIsOpenRef.current ||
        latestSelectedStreamIdRef.current !== targetStreamId ||
        latestSelectedSensorIdRef.current !== targetSensorId
      ) {
        return;
      }

      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('Không thể gán luồng telemetry. Vui lòng kiểm tra lại phiên bản stream.');
      setAssignmentError(msg);
    } finally {
      // R4-F1: Only the active confirmation token may release the busy lock
      if (activeConfirmationTokenRef.current === confirmToken) {
        activeConfirmationTokenRef.current = null;
        isSubmittingAssignmentRef.current = false;
        setSubmittingAssignment(false);
      }
    }
  };

  const handleRetire = async (streamId: number, version: number) => {
    if (!confirm(t('Bạn có chắc chắn muốn ngừng luồng nhận telemetry hiện tại?'))) {
      return;
    }
    try {
      await retireCurrentAssignment(streamId, version);
      if (zone) loadSources(zone.code);
    } catch {
      alert(t('Không thể ngừng luồng telemetry. Vui lòng kiểm tra lại.'));
    }
  };

  if (!isOpen || !zone) return null;

  const currentSources = sources.filter(s => s.effectiveTo === null);
  const historicalSources = sources.filter(s => s.effectiveTo !== null);

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="relative w-full md:max-w-[520px] h-full bg-white dark:bg-[#0f172a] shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#f8f9ff] dark:bg-slate-800/40 shrink-0 pt-[max(1rem,env(safe-area-inset-top))] md:pt-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004489]/10 text-[#004489] dark:bg-[#60a5fa]/20 dark:text-[#60a5fa] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">settings_input_antenna</span>
            </div>
            <div>
              <h2 id="source-drawer-title" className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
                {t('Nguồn nhận dữ liệu cảm biến')}
              </h2>
              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                {t('Khu vực {0} ({1})', [zone.code, zone.name || ''])}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submittingAssignment}
            aria-label={t('Đóng')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Logical Sensors in Zone */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#0b1c30] dark:text-slate-200 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#004489]">device_hub</span>
              {t('Các loại cảm biến kỹ thuật trong khu vực')}
            </h3>

            {sensorsLoading ? (
              <div className="text-xs text-slate-400 animate-pulse py-2">{t('Đang tải danh sách sensor...')}</div>
            ) : sensorsError ? (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                <span>{sensorsError}</span>
                <button
                  type="button"
                  data-testid="btn-retry-sensors"
                  onClick={() => zone && loadSensors(zone.code)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200 transition-colors shrink-0"
                >
                  {t('Thử lại')}
                </button>
              </div>
            ) : sensors.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">{t('Khu vực chưa cấu hình sensor kỹ thuật.')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2" data-testid="zone-sensors-grid">
                {sensors.map(s => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="font-semibold text-[#0b1c30] dark:text-slate-100">{s.type}</div>
                    <div className="text-[11px] text-[#64748b]">ID: {s.id} · Đơn vị: {s.unit}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* R2: Independent Capability Notice when SOURCE_METADATA_DISABLED */}
          {isMetadataDisabled && (
            <div
              data-testid="metadata-disabled-banner"
              className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1.5"
            >
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">lock</span>
                  {t('Tính năng siêu dữ liệu chưa kích hoạt')} (SOURCE_METADATA_DISABLED)
                </span>
                <button
                  type="button"
                  data-testid="btn-retry-registry"
                  onClick={() => loadRegistry(providerFilter, sensorTypeFilter)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-200/80 hover:bg-amber-300 text-amber-900 dark:bg-amber-900 dark:text-amber-200 transition-colors shrink-0"
                >
                  {t('Thử lại')}
                </button>
              </div>
              <p className="leading-relaxed">
                {t('Máy chủ hiện đang tắt tính năng siêu dữ liệu nguồn nhận. Không thể liệt kê hoặc gán mới luồng telemetry từ Registry.')}
              </p>
            </div>
          )}

          {/* Independent Registry Error Notice (when not metadata disabled and form not open) */}
          {!isAssigning && registryError && !isMetadataDisabled && (
            <div
              data-testid="registry-error-banner"
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2"
            >
              <span>{registryError}</span>
              <button
                type="button"
                data-testid="btn-retry-registry"
                onClick={() => loadRegistry(providerFilter, sensorTypeFilter)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200 transition-colors shrink-0"
              >
                {t('Thử lại')}
              </button>
            </div>
          )}

          {/* Current Active Stream */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0b1c30] dark:text-slate-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-600">online_prediction</span>
                {t('Luồng telemetry đang hoạt động')}
              </h3>

              {!isAssigning && (
                <button
                  type="button"
                  data-testid="btn-open-assign-stream"
                  onClick={() => {
                    setSelectedStreamId(null);
                    setChosenStreamDetail(null);
                    setReason('');
                    setAssignmentError(null);
                    setIsAssigning(true);
                  }}
                  disabled={sensorsLoading || sensorsError !== null || sensors.length === 0 || isMetadataDisabled}
                  title={
                    sensorsError
                      ? t('Vui lòng tải lại cảm biến trước khi gán')
                      : sensors.length === 0
                      ? t('Khu vực chưa có cảm biến để gán')
                      : isMetadataDisabled
                      ? t('Tính năng siêu dữ liệu đang bị tắt')
                      : t('Gán hoặc thay đổi luồng nhận')
                  }
                  className="h-11 min-h-[44px] px-4 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-base">swap_horiz</span>
                  <span>{t('Gán / Thay nguồn nhận')}</span>
                </button>
              )}
            </div>

            {sourcesLoading ? (
              <div className="text-xs text-slate-400 animate-pulse py-2">{t('Đang tải luồng telemetry...')}</div>
            ) : sourcesError ? (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                <span>{sourcesError}</span>
                <button
                  type="button"
                  data-testid="btn-retry-sources"
                  onClick={() => zone && loadSources(zone.code)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200 transition-colors shrink-0"
                >
                  {t('Thử lại')}
                </button>
              </div>
            ) : currentSources.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                {t('Chưa có luồng telemetry nào được gán cho khu vực này.')}
              </div>
            ) : (
              <div className="space-y-2">
                {currentSources.map(cs => (
                  <div
                    key={cs.id}
                    className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">
                        Stream #{cs.streamId} · Sensor #{cs.sensorId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        {t('Đang nhận')} (v{cs.version})
                      </span>
                    </div>

                    <p className="text-[#64748b] text-[11px] leading-relaxed">
                      {t('Lý do gán')}: {cs.reason}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[11px] text-[#64748b]">
                      <span>{t('Bắt đầu')}: {new Date(cs.effectiveFrom).toLocaleDateString('vi-VN')}</span>
                      <button
                        type="button"
                        onClick={() => handleRetire(cs.streamId, cs.version)}
                        className="min-h-[44px] px-2 text-red-600 hover:text-red-700 font-semibold flex items-center transition-colors"
                      >
                        {t('Ngừng luồng này')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment Form Section (When isAssigning is true) */}
          {isAssigning && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-2 border-[#004489] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#004489] dark:text-[#60a5fa] flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">link</span>
                  {t('Gán luồng telemetry từ Registry')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAssigning(false)}
                  disabled={submittingAssignment}
                  className="h-11 min-h-[44px] px-2 text-xs text-slate-500 hover:text-slate-700 flex items-center transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {t('Đóng form')}
                </button>
              </div>

              {assignmentError && (
                <div className="p-2.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-xs">
                  {assignmentError}
                </div>
              )}

              <form onSubmit={handleConfirmAssignment} className="space-y-3">
                {/* 1. Choose Sensor */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                    {t('Chọn Sensor kỹ thuật cần gán')}
                  </label>
                  <select
                    value={selectedSensorId ?? ''}
                    disabled={submittingAssignment}
                    onChange={e => changeSelectedSensor(Number(e.target.value))}
                    className="w-full h-11 min-h-[44px] px-3 text-base md:text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sensors.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.type} (ID #{s.id} - {s.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Choose Available Stream from Registry */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                    {t('Chọn luồng stream sẵn có trong hệ thống')}
                  </label>

                  {/* Filter Controls (F7) */}
                  <div className="grid grid-cols-2 gap-2 pb-1">
                    <div>
                      <label htmlFor="select-provider-filter" className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                        {t('Nhà cung cấp')}
                      </label>
                      <select
                        id="select-provider-filter"
                        data-testid="select-provider-filter"
                        value={providerFilter}
                        disabled={submittingAssignment}
                        onChange={e => handleFilterChange(e.target.value, sensorTypeFilter)}
                        className="w-full h-10 px-2 text-base md:text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="ALL">{t('Tất cả nhà cung cấp')}</option>
                        {providers.map(p => (
                          <option key={p.id} value={String(p.id)}>
                            {p.displayName || p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-sensor-type-filter" className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                        {t('Loại cảm biến')}
                      </label>
                      <select
                        id="select-sensor-type-filter"
                        data-testid="select-sensor-type-filter"
                        value={sensorTypeFilter}
                        disabled={submittingAssignment}
                        onChange={e => handleFilterChange(providerFilter, e.target.value)}
                        className="w-full h-10 px-2 text-base md:text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="ALL">{t('Tất cả loại sensor')}</option>
                        {ALL_SENSOR_TYPES.map(st => (
                          <option key={st} value={st}>
                            {SENSOR_TYPE_LABELS[st] || st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {registryLoading ? (
                    <div className="text-xs text-slate-400 animate-pulse py-3 text-center">{t('Đang tải danh sách stream...')}</div>
                  ) : isMetadataDisabled ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">lock</span>
                          {t('Tính năng siêu dữ liệu chưa kích hoạt')} (SOURCE_METADATA_DISABLED)
                        </span>
                        <button
                          type="button"
                          data-testid="btn-retry-registry"
                          onClick={() => loadRegistry(providerFilter, sensorTypeFilter)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-200 hover:bg-amber-300 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 transition-colors shrink-0"
                        >
                          {t('Thử lại')}
                        </button>
                      </div>
                      <p className="leading-relaxed">
                        {t('Máy chủ hiện đang tắt tính năng siêu dữ liệu nguồn nhận. Không thể liệt kê hoặc chọn stream từ Registry.')}
                      </p>
                    </div>
                  ) : registryError ? (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                      <span>{registryError}</span>
                      <button
                        type="button"
                        data-testid="btn-retry-registry"
                        onClick={() => loadRegistry(providerFilter, sensorTypeFilter)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200 transition-colors shrink-0"
                      >
                        {t('Thử lại')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        data-testid="available-streams-list"
                        className="max-h-44 overflow-y-auto space-y-1.5 p-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                      >
                        {availableStreams.length === 0 ? (
                          <p className="text-xs text-slate-400 p-2 text-center">{t('Không có stream phù hợp bộ lọc.')}</p>
                        ) : (
                          availableStreams.map(st => {
                            const isSelected = st.id === selectedStreamId;
                            return (
                              <div
                                key={st.id}
                                data-testid={`stream-card-${st.id}`}
                                onClick={() => handleSelectStream(st.id)}
                                className={`p-2 rounded-md text-xs transition-colors ${
                                  submittingAssignment ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                } ${
                                  isSelected
                                    ? 'bg-[#eff4ff] dark:bg-blue-950/60 border border-[#004489] text-[#004489] dark:text-[#60a5fa]'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">Stream #{st.id}: {st.externalId}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
                                    {st.sensorType}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#64748b] mt-0.5">
                                  {st.provider?.displayName || st.provider?.name || 'Provider'} · {st.acquisitionSupport}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {nextAfterId !== null && (
                        <button
                          type="button"
                          data-testid="btn-load-more-streams"
                          onClick={handleLoadMore}
                          disabled={loadingMore || submittingAssignment}
                          className="w-full h-11 min-h-[44px] mt-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <span className="material-symbols-outlined text-sm">expand_more</span>
                          <span>{loadingMore ? t('Đang tải...') : t('Tải thêm nguồn dữ liệu')}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Stream Detail & Honest Registry Warning */}
                {chosenStreamDetail && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="font-bold text-[#0b1c30] dark:text-slate-100">
                      {t('Chi tiết stream đã kiểm chứng')}:
                    </div>
                    <div className="text-[11px] text-[#64748b] space-y-0.5">
                      <div>Version kỳ vọng: <span className="font-mono font-bold">{chosenStreamDetail.latestAssignmentVersion}</span></div>
                      <div>Namespace: {chosenStreamDetail.externalNamespace}</div>
                      <div>Hỗ trợ thu nhận: <span className="font-semibold">{chosenStreamDetail.acquisitionSupport}</span></div>
                    </div>

                    {chosenStreamDetail.acquisitionSupport === 'REGISTRY_ONLY' && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded text-[11px] text-amber-800 dark:text-amber-200">
                        {t('Lưu ý: Luồng stream này đang ở trạng thái REGISTRY_ONLY (chưa có adapter thu nhận tự động được xác thực). Việc gán chỉ cập nhật siêu dữ liệu.')}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Reason */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                    {t('Lý do gán luồng telemetry')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    maxLength={1000}
                    rows={2}
                    value={reason}
                    disabled={submittingAssignment}
                    onChange={e => setReason(e.target.value)}
                    placeholder="VD: Cấu hình trạm đo độ ẩm đất mới thay thế trạm cũ hỏng..."
                    className="w-full p-2.5 text-base md:text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="text-[10px] text-right text-slate-400">
                    {reason.length}/1000 {t('ký tự')}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAssigning(false)}
                    disabled={submittingAssignment}
                    className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {t('Hủy')}
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedStreamId || !chosenStreamDetail || submittingAssignment}
                    className="h-11 min-h-[44px] px-5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs"
                  >
                    {submittingAssignment ? t('Đang gán...') : t('Xác nhận gán')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historical Assignments (Bounded 200) */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-[#64748b] dark:text-slate-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">history</span>
              {t('Lịch sử gán nguồn trước đây')} ({historicalSources.length})
            </h3>

            {sourcesLoading ? (
              <div className="text-xs text-slate-400 animate-pulse py-2">{t('Đang tải lịch sử...')}</div>
            ) : sourcesError ? (
              <p className="text-xs text-red-500 py-1">{sourcesError}</p>
            ) : historicalSources.length === 0 ? (
              <p className="text-xs text-slate-400">{t('Chưa có lịch sử gán nguồn.')}</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {historicalSources.slice(0, 50).map(hs => (
                  <div
                    key={hs.id}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] text-slate-600 dark:text-slate-400"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span>Stream #{hs.streamId} · v{hs.version}</span>
                      <span className="text-slate-400">{hs.effectiveTo ? new Date(hs.effectiveTo).toLocaleDateString('vi-VN') : ''}</span>
                    </div>
                    <div className="truncate mt-0.5">{hs.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
}
