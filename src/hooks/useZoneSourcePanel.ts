import { useCallback, useEffect, useRef, useState } from 'react';
import {
  executeZoneSourceOperation,
  getIotLabMappingsAdmin,
  getSafeRoutingContract,
  getSafeSourceProviders,
  getSafeSourceStreamDetail,
  getSafeSourceStreams,
  getSafeZoneSensors,
  getZoneSourceAssignments,
  getZoneSourceNodes,
  getZoneSourceOperation,
  getZoneSourceStatus,
  parseZoneSourceApiError,
} from '../api/zoneSource';
import type {
  ProviderDiscovery,
  RoutingContract,
  StreamDiscovery,
} from '../types/farmVisual';
import type { SensorMetadata } from '../types/sensor';
import {
  toDecimalId,
  toDecimalVersion,
  extractReceiptNode,
  extractReceiptStream,
  type DecimalId,
  type IotLabMappingAdminItem,
  type ParsedZoneSourceError,
  type RetainedNodeMetadata,
  type StoredPendingZoneSourceOperation,
  type TargetAssignmentSnapshot,
  type ZoneSourceAssignmentItem,
  type ZoneSourceNodeItem,
  type ZoneSourceOperationRequest,
  type ZoneSourceReceipt,
  type ZoneSourceRecordingEvidence,
  type ZoneSourceStatusResponse,
  type ZoneSourceStatusSensorItem,
} from '../types/zoneSource';
import {
  clearPendingZoneSourceOperation,
  clearRetainedNodeMetadata,
  generateZoneSourceOperationId,
  getPendingZoneSourceOperation,
  getRetainedNodeMetadata,
  savePendingZoneSourceOperation,
  saveRetainedNodeMetadata,
} from '../utils/zoneSourceOperationStorage';
import { canonicalSerializeZoneSourceBody } from '../utils/zoneSourceValidation';

export type DrawerTab = 'CURRENT' | 'HISTORY';

export type DrawerSubflow =
  | { view: 'MAIN' }
  | {
      view: 'EVIDENCE';
      assignment: ZoneSourceAssignmentItem;
      evidence: ZoneSourceRecordingEvidence;
      returnTab: DrawerTab;
    }
  | {
      view: 'PICKER';
      targetSensorId: DecimalId;
      mode: 'ASSIGN' | 'REPLACE';
      replacingAssignment?: ZoneSourceAssignmentItem;
    }
  | {
      view: 'REGISTER_NODE';
      returnToPicker?: {
        targetSensorId: DecimalId;
        mode: 'ASSIGN' | 'REPLACE';
        replacingAssignment?: ZoneSourceAssignmentItem;
      };
    }
  | {
      view: 'PARTIAL_NODE_RETAINED';
      retainedNode: RetainedNodeMetadata;
      returnToPicker?: {
        targetSensorId: DecimalId;
        mode: 'ASSIGN' | 'REPLACE';
        replacingAssignment?: ZoneSourceAssignmentItem;
      };
    }
  | {
      view: 'REGISTER_STREAM';
      prefillNode?: RetainedNodeMetadata | null;
      returnToPicker?: {
        targetSensorId: DecimalId;
        mode: 'ASSIGN' | 'REPLACE';
        replacingAssignment?: ZoneSourceAssignmentItem;
      };
    }
  | {
      view: 'ASSIGN_OR_REPLACE';
      mode: 'ASSIGN' | 'CONFIGURE' | 'REPLACE';
      targetSensor: ZoneSourceStatusSensorItem;
      streamDetail: StreamDiscovery;
      currentAssignment?: ZoneSourceAssignmentItem;
      replacingAssignment?: ZoneSourceAssignmentItem;
    }
  | {
      view: 'STOP';
      targetSensor: ZoneSourceStatusSensorItem;
      assignment: ZoneSourceAssignmentItem;
    }
  | {
      view: 'CONFLICT';
      error: ParsedZoneSourceError;
      pendingRecord: StoredPendingZoneSourceOperation;
      latestStreamDetail?: StreamDiscovery | null;
      latestAssignment?: ZoneSourceAssignmentItem | null;
      formSnapshot?: unknown;
    }
  | {
      view: 'UNKNOWN';
      pendingRecord: StoredPendingZoneSourceOperation;
      receipt404: boolean;
      error?: ParsedZoneSourceError | null;
    }
  | {
      view: 'RECEIPT_RESULT';
      receipt: ZoneSourceReceipt;
      pendingRecord: StoredPendingZoneSourceOperation;
      liveStatusError: ParsedZoneSourceError | null;
    };

export interface UseZoneSourcePanelParams {
  isOpen: boolean;
  zoneCode: string | null;
  farmId: number | null;
  zoneId?: number | string | null;
  actorId: number | null;
  isOwner: boolean;
  onClose: () => void;
}

interface ActiveScope {
  isOpen: boolean;
  actorId: DecimalId | null;
  farmId: number | null;
  zoneCode: string | null;
  zoneId: string | null;
  isOwner: boolean;
  generation: number;
}

export function useZoneSourcePanel({
  isOpen,
  zoneCode,
  farmId,
  zoneId,
  actorId,
  isOwner,
  onClose,
}: UseZoneSourcePanelParams) {
  const actorDecimalId = actorId && actorId > 0 ? String(actorId) : null;
  const zoneIdStr = zoneId != null ? String(zoneId) : null;

  const generationRef = useRef(0);
  const selectionGenerationRef = useRef(0);
  const configureGenerationRef = useRef(0);
  const pickerGenerationRef = useRef(0);
  const nodesGenerationRef = useRef(0);
  const historyGenerationRef = useRef(0);
  const iotLabMappingsGenerationRef = useRef(0);
  const scopeRef = useRef<ActiveScope>({
    isOpen: false,
    actorId: null,
    farmId: null,
    zoneCode: null,
    zoneId: null,
    isOwner: false,
    generation: 0,
  });

  const statusAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const pickerAbortRef = useRef<AbortController | null>(null);
  const configureAbortRef = useRef<AbortController | null>(null);
  const submitAbortRef = useRef<AbortController | null>(null);

  // Navigation & Subflow
  const [activeTab, setActiveTab] = useState<DrawerTab>('CURRENT');
  const [subflow, setSubflow] = useState<DrawerSubflow>({ view: 'MAIN' });
  const [expandedSensorIds, setExpandedSensorIds] = useState<Record<string, boolean>>({});
  const [formDirty, setFormDirty] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaveIntent, setLeaveIntent] = useState<'CLOSE' | 'BACK' | null>(null);

  // Domain 1: Source status (UI01/UI02/UI15)
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusLoadingMore, setStatusLoadingMore] = useState(false);
  const [statusData, setStatusData] = useState<ZoneSourceStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<ParsedZoneSourceError | null>(null);
  const [fallbackSensors, setFallbackSensors] = useState<SensorMetadata[] | null>(null);

  // Domain 2: History (UI10/UI15)
  const [historySensorId, setHistorySensorId] = useState<DecimalId | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyItems, setHistoryItems] = useState<ZoneSourceAssignmentItem[]>([]);
  const [historyNextAfterId, setHistoryNextAfterId] = useState<DecimalId | null>(null);
  const [historyError, setHistoryError] = useState<ParsedZoneSourceError | null>(null);

  // Domain 3: Picker & Registry (UI03/UI04/UI05/UI06)
  const [providers, setProviders] = useState<ProviderDiscovery[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [pickerStreams, setPickerStreams] = useState<StreamDiscovery[]>([]);
  const [pickerNextAfterId, setPickerNextAfterId] = useState<number | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerLoadingMore, setPickerLoadingMore] = useState(false);
  const [pickerError, setPickerError] = useState<ParsedZoneSourceError | null>(null);
  const [selectedPickerStreamId, setSelectedPickerStreamId] = useState<number | null>(null);
  const [selectedStreamDetail, setSelectedStreamDetail] = useState<StreamDiscovery | null>(null);
  const [streamDetailLoading, setStreamDetailLoading] = useState(false);
  const [streamDetailError, setStreamDetailError] = useState<ParsedZoneSourceError | null>(null);

  // Picker Filters
  const [filterProviderId, setFilterProviderId] = useState<string>('ALL');
  const [filterAdapterKind, setFilterAdapterKind] = useState<string>('ALL');
  const [filterSensorType, setFilterSensorType] = useState<string>('ALL');
  const [filterIncludeRetired, setFilterIncludeRetired] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  // Registry Helpers (nodes, routing contract, IoTLab mappings)
  const [nodes, setNodes] = useState<ZoneSourceNodeItem[]>([]);
  const [nodesNextAfterId, setNodesNextAfterId] = useState<DecimalId | null>(null);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodesError, setNodesError] = useState<ParsedZoneSourceError | null>(null);
  const [routingContract, setRoutingContract] = useState<RoutingContract | null>(null);
  const [iotLabMappings, setIotLabMappings] = useState<IotLabMappingAdminItem[]>([]);
  const [iotLabMappingsLoading, setIotLabMappingsLoading] = useState(false);
  const [iotLabMappingsError, setIotLabMappingsError] = useState<ParsedZoneSourceError | null>(null);

  // Retained node & operation recovery state
  const [retainedNode, setRetainedNode] = useState<RetainedNodeMetadata | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingReceipt, setCheckingReceipt] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [inlineSubmitError, setInlineSubmitError] = useState<ParsedZoneSourceError | null>(null);

  const isSameScope = useCallback((captured: ActiveScope): boolean => {
    const cur = scopeRef.current;
    return (
      cur.isOpen &&
      captured.isOpen &&
      cur.generation === captured.generation &&
      cur.actorId === captured.actorId &&
      cur.farmId === captured.farmId &&
      cur.zoneCode === captured.zoneCode &&
      (captured.zoneId == null || cur.zoneId === captured.zoneId) &&
      cur.isOwner === captured.isOwner
    );
  }, []);

  const abortAll = useCallback(() => {
    statusAbortRef.current?.abort();
    historyAbortRef.current?.abort();
    pickerAbortRef.current?.abort();
    configureAbortRef.current?.abort();
    submitAbortRef.current?.abort();
  }, []);

  // Probe sessionStorage availability cleanly
  const checkStorageWritable = useCallback((): boolean => {
    try {
      if (typeof sessionStorage === 'undefined') return false;
      const probeKey = '__duricare_zs_probe__';
      sessionStorage.setItem(probeKey, '1');
      sessionStorage.removeItem(probeKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadSourceStatus = useCallback(
    async (opts?: { append?: boolean }) => {
      const captured = { ...scopeRef.current };
      if (!captured.isOpen || !captured.zoneCode) return;

      const append = Boolean(opts?.append);
      const afterSensorId = append ? statusData?.page.nextAfterSensorId ?? undefined : undefined;
      if (append && !afterSensorId) return;

      if (!append) {
        statusAbortRef.current?.abort();
      }
      const controller = new AbortController();
      statusAbortRef.current = controller;

      if (append) setStatusLoadingMore(true);
      else {
        setStatusLoading(true);
        setStatusError(null);
      }

      try {
        const res = await getZoneSourceStatus(
          captured.zoneCode,
          { afterSensorId, limit: 20 },
          controller.signal
        );
        if (!isSameScope(captured)) return;

        setStatusData(prev => {
          if (!append || !prev) return res;
          const existingIds = new Set(prev.items.map(i => i.sensorId));
          const merged = [
            ...prev.items,
            ...res.items.filter(i => !existingIds.has(i.sensorId)),
          ];
          return { ...res, items: merged };
        });
        setStatusError(null);
        setFallbackSensors(null);

        if (!append && res.items.length > 0) {
          setExpandedSensorIds(prev => {
            if (Object.keys(prev).length > 0) return prev;
            const soil = res.items.find(s => s.sensorType === 'SOIL_MOISTURE');
            const target = soil ?? res.items[0];
            return { [target.sensorId]: true };
          });
          setHistorySensorId(prev => prev ?? res.items[0].sensorId);
        }
      } catch (err) {
        if (!isSameScope(captured)) return;
        const parsed = parseZoneSourceApiError(err);
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { code?: string })?.code === 'ERR_CANCELED') {
          return;
        }
        setStatusError(parsed);
        // If status block failed with 503/network and we don't have sensors yet, read legacy sensors cleanly for context
        if (!append && !statusData && parsed.status === 503 && !parsed.isDisabledFeature) {
          try {
            const sensors = await getSafeZoneSensors(captured.zoneCode);
            if (!isSameScope(captured)) return;
            setFallbackSensors(sensors);
          } catch {
            // Keep clean error without inventing sensor rows
          }
        }
      } finally {
        if (isSameScope(captured)) {
          setStatusLoading(false);
          setStatusLoadingMore(false);
        }
      }
    },
    [isSameScope, statusData]
  );

  const loadHistory = useCallback(
    async (targetSensorId: DecimalId, opts?: { append?: boolean }) => {
      const captured = { ...scopeRef.current };
      if (!captured.isOpen || !captured.zoneCode || !targetSensorId) return;

      const append = Boolean(opts?.append);
      const afterAssignmentId = append ? historyNextAfterId ?? undefined : undefined;
      if (append && !afterAssignmentId) return;

      const historyGen = ++historyGenerationRef.current;

      if (!append) {
        historyAbortRef.current?.abort();
      }
      const controller = new AbortController();
      historyAbortRef.current = controller;

      setHistorySensorId(targetSensorId);
      if (append) setHistoryLoadingMore(true);
      else {
        setHistoryLoading(true);
        setHistoryError(null);
      }

      try {
        const res = await getZoneSourceAssignments(
          captured.zoneCode,
          { sensorId: targetSensorId, afterAssignmentId, limit: 20 },
          controller.signal
        );
        if (historyGen !== historyGenerationRef.current || !isSameScope(captured)) return;
        setHistoryItems(prev => {
          if (!append) return res.items;
          const seen = new Set(prev.map(i => i.assignmentId));
          return [...prev, ...res.items.filter(i => !seen.has(i.assignmentId))];
        });
        setHistoryNextAfterId(res.page.nextAfterAssignmentId);
        setHistoryError(null);
      } catch (err) {
        if (historyGen !== historyGenerationRef.current || !isSameScope(captured)) return;
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { code?: string })?.code === 'ERR_CANCELED') {
          return;
        }
        setHistoryError(parseZoneSourceApiError(err));
      } finally {
        if (historyGen === historyGenerationRef.current && isSameScope(captured)) {
          setHistoryLoading(false);
          setHistoryLoadingMore(false);
        }
      }
    },
    [historyNextAfterId, isSameScope]
  );

  const loadProvidersAndContract = useCallback(async () => {
    const captured = { ...scopeRef.current };
    if (!captured.isOpen || isOwner) return;
    setProvidersLoading(true);
    try {
      const [provPage, contract] = await Promise.all([
        getSafeSourceProviders({ limit: 50, includeRetired: filterIncludeRetired }),
        getSafeRoutingContract().catch(() => null),
      ]);
      if (!isSameScope(captured)) return;
      setProviders(provPage.items);
      if (contract) setRoutingContract(contract);
    } catch {
      // handled per picker error if needed
    } finally {
      if (isSameScope(captured)) setProvidersLoading(false);
    }
  }, [filterIncludeRetired, isOwner, isSameScope]);

  const loadPickerStreams = useCallback(
    async (opts?: {
      append?: boolean;
      providerId?: string;
      sensorType?: string;
      includeRetired?: boolean;
      afterIdOverride?: number;
    }) => {
      const captured = { ...scopeRef.current };
      if (!captured.isOpen || isOwner) return;

      const append = Boolean(opts?.append);
      const afterId = append ? opts?.afterIdOverride ?? pickerNextAfterId ?? undefined : undefined;
      if (append && afterId === undefined) return;

      const pid = opts?.providerId ?? filterProviderId;
      const stype = opts?.sensorType ?? filterSensorType;
      const inclRetired = opts?.includeRetired ?? filterIncludeRetired;

      const pickerGen = ++pickerGenerationRef.current;

      if (!append) {
        setSelectedPickerStreamId(null);
        setSelectedStreamDetail(null);
        setStreamDetailError(null);
      }
      const controller = new AbortController();
      pickerAbortRef.current = controller;

      if (append) setPickerLoadingMore(true);
      else {
        setPickerLoading(true);
        setPickerError(null);
      }

      try {
        const res = await getSafeSourceStreams(
          {
            afterId,
            limit: 20,
            providerId: pid !== 'ALL' ? Number(pid) : undefined,
            sensorType: stype !== 'ALL' ? stype : undefined,
            includeRetired: inclRetired,
          },
          controller.signal
        );
        if (pickerGen !== pickerGenerationRef.current || !isSameScope(captured)) return;
        setPickerStreams(prev => {
          if (!append) return res.items;
          const seen = new Set(prev.map(x => x.id));
          return [...prev, ...res.items.filter(x => !seen.has(x.id))];
        });
        setPickerNextAfterId(res.page.nextAfterId);
        setPickerError(null);
      } catch (err) {
        if (pickerGen !== pickerGenerationRef.current || !isSameScope(captured)) return;
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { code?: string })?.code === 'ERR_CANCELED') {
          return;
        }
        setPickerError(parseZoneSourceApiError(err));
      } finally {
        if (pickerGen === pickerGenerationRef.current && isSameScope(captured)) {
          setPickerLoading(false);
          setPickerLoadingMore(false);
        }
      }
    },
    [
      filterIncludeRetired,
      filterProviderId,
      filterSensorType,
      isOwner,
      isSameScope,
      pickerNextAfterId,
    ]
  );

  const selectAndRefreshStream = useCallback(
    async (streamId: number): Promise<StreamDiscovery | null> => {
      const selectionGen = ++selectionGenerationRef.current;
      const captured = { ...scopeRef.current };
      setSelectedPickerStreamId(streamId);
      setStreamDetailLoading(true);
      setStreamDetailError(null);
      try {
        const detail = await getSafeSourceStreamDetail(streamId);
        if (selectionGen !== selectionGenerationRef.current || !isSameScope(captured)) return null;
        setSelectedStreamDetail(detail);
        return detail;
      } catch (err) {
        if (selectionGen !== selectionGenerationRef.current || !isSameScope(captured)) return null;
        setStreamDetailError(parseZoneSourceApiError(err));
        setSelectedStreamDetail(null);
        return null;
      } finally {
        if (selectionGen === selectionGenerationRef.current && isSameScope(captured)) {
          setStreamDetailLoading(false);
        }
      }
    },
    [isSameScope]
  );

  const loadNodesForProvider = useCallback(
    async (providerId: DecimalId, opts?: { append?: boolean }) => {
      const captured = { ...scopeRef.current };
      if (!captured.isOpen || isOwner || !providerId) return;
      const append = Boolean(opts?.append);
      const afterId = append ? nodesNextAfterId ?? undefined : undefined;
      if (append && !afterId) return;

      const nodesGen = ++nodesGenerationRef.current;

      setNodesLoading(true);
      if (!append) setNodesError(null);
      try {
        const page = await getZoneSourceNodes({
          providerId,
          afterId,
          limit: 50,
          includeRetired: false,
        });
        if (nodesGen !== nodesGenerationRef.current || !isSameScope(captured)) return;
        setNodes(prev => {
          if (!append) return page.items;
          const seen = new Set(prev.map(n => n.id));
          return [...prev, ...page.items.filter(n => !seen.has(n.id))];
        });
        setNodesNextAfterId(page.page.nextAfterId);
      } catch (err) {
        if (nodesGen !== nodesGenerationRef.current || !isSameScope(captured)) return;
        setNodesError(parseZoneSourceApiError(err));
      } finally {
        if (nodesGen === nodesGenerationRef.current && isSameScope(captured)) setNodesLoading(false);
      }
    },
    [isOwner, isSameScope, nodesNextAfterId]
  );

  const loadIotLabMappings = useCallback(async () => {
    const captured = { ...scopeRef.current };
    if (!captured.isOpen || isOwner) return;
    const iotLabGen = ++iotLabMappingsGenerationRef.current;
    setIotLabMappingsLoading(true);
    setIotLabMappingsError(null);
    try {
      const list = await getIotLabMappingsAdmin();
      if (iotLabGen !== iotLabMappingsGenerationRef.current || !isSameScope(captured)) return;
      setIotLabMappings(list);
    } catch (err) {
      if (iotLabGen !== iotLabMappingsGenerationRef.current || !isSameScope(captured)) return;
      setIotLabMappingsError(parseZoneSourceApiError(err));
    } finally {
      if (iotLabGen === iotLabMappingsGenerationRef.current && isSameScope(captured)) setIotLabMappingsLoading(false);
    }
  }, [isOwner, isSameScope]);

  // Reset & initialize whenever drawer opens or zone/farm/actor switches
  useEffect(() => {
    generationRef.current += 1;
    selectionGenerationRef.current += 1;
    configureGenerationRef.current += 1;
    pickerGenerationRef.current += 1;
    nodesGenerationRef.current += 1;
    historyGenerationRef.current += 1;
    iotLabMappingsGenerationRef.current += 1;
    const gen = generationRef.current;
    abortAll();

    scopeRef.current = {
      isOpen,
      actorId: actorDecimalId,
      farmId,
      zoneCode,
      zoneId: zoneIdStr,
      isOwner,
      generation: gen,
    };

    setActiveTab('CURRENT');
    setSubflow({ view: 'MAIN' });
    setExpandedSensorIds({});
    setFormDirty(false);
    setLeaveConfirmOpen(false);
    setLeaveIntent(null);
    setStatusData(null);
    setStatusError(null);
    setFallbackSensors(null);
    setHistorySensorId(null);
    setHistoryItems([]);
    setHistoryNextAfterId(null);
    setHistoryError(null);
    setPickerStreams([]);
    setPickerNextAfterId(null);
    setPickerError(null);
    setSelectedPickerStreamId(null);
    setSelectedStreamDetail(null);
    setStreamDetailError(null);
    setInlineSubmitError(null);
    setSubmitting(false);
    setCheckingReceipt(false);

    if (!isOpen || !zoneCode) {
      return;
    }

    const canWriteStorage = checkStorageWritable();
    setStorageUnavailable(!canWriteStorage);

    // Check pending operation recovery or retained node for this (actorId, zoneCode)
    if (!isOwner && actorDecimalId) {
      const pending = getPendingZoneSourceOperation(actorDecimalId, zoneCode);
      const retained = getRetainedNodeMetadata(actorDecimalId, zoneCode);
      setRetainedNode(retained);
      if (pending) {
        if (pending.phase === 'CONFLICT_REVIEW') {
          clearPendingZoneSourceOperation(actorDecimalId, zoneCode);
        } else {
          setSubflow({
            view: 'UNKNOWN',
            pendingRecord: pending,
            receipt404: pending.phase === 'RECEIPT_404',
          });
        }
      }
    } else {
      setRetainedNode(null);
    }

    void loadSourceStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, zoneCode, farmId, zoneIdStr, actorDecimalId, isOwner]);

  const submitCommand = useCallback(
    async (
      command: ZoneSourceOperationRequest,
      targetSnapshot: TargetAssignmentSnapshot | null,
      options?: {
        reusingPending?: StoredPendingZoneSourceOperation;
        contextProviderLabel?: string;
        returnToPicker?: {
          targetSensorId: DecimalId;
          mode: 'ASSIGN' | 'REPLACE';
          replacingAssignment?: ZoneSourceAssignmentItem;
        };
      }
    ) => {
      const captured = { ...scopeRef.current };
      if (!captured.isOpen || !captured.zoneCode || !captured.actorId || isOwner) return;

      const canonicalBody = canonicalSerializeZoneSourceBody(command);
      if (
        options?.reusingPending &&
        options.reusingPending.canonicalBody !== canonicalBody
      ) {
        setInlineSubmitError({
          status: 400,
          code: 'ZS_OPERATION_BODY_CONFLICT',
          message: 'Không thể gửi lại UUID cũ với nội dung khác.',
          fieldErrors: [],
          isNetworkOrTimeout: false,
          isDisabledFeature: false,
          isConflict: true,
          isNotFound: false,
          isUnauthorized: false,
          isForbidden: false,
        });
        return;
      }

      const pendingRecord: StoredPendingZoneSourceOperation = options?.reusingPending
        ? {
            ...options.reusingPending,
            phase: 'IN_FLIGHT',
            updatedAt: new Date().toISOString(),
          }
        : {
            version: 1,
            actorId: captured.actorId,
            zoneCode: captured.zoneCode,
            sensorId:
              'sensorId' in command ? command.sensorId : null,
            operationId: command.operationId,
            kind: command.kind,
            command,
            canonicalBody,
            targetSnapshot,
            phase: 'IN_FLIGHT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      const persisted = savePendingZoneSourceOperation(pendingRecord);
      if (!persisted.ok) {
        setStorageUnavailable(true);
        return;
      }
      setStorageUnavailable(false);
      setSubmitting(true);
      setInlineSubmitError(null);

      submitAbortRef.current?.abort();
      const controller = new AbortController();
      submitAbortRef.current = controller;

      try {
        const { receipt } = await executeZoneSourceOperation(command, controller.signal);
        if (!isSameScope(captured)) return;

        clearPendingZoneSourceOperation(captured.actorId, captured.zoneCode);
        setFormDirty(false);

        const registeredNode = extractReceiptNode(receipt.after);
        if (command.kind === 'REGISTER_NODE' && registeredNode) {
          const retainedRecord: RetainedNodeMetadata = {
            actorId: captured.actorId,
            providerId: registeredNode.providerId,
            providerLabel:
              options?.contextProviderLabel ??
              providers.find(p => String(p.id) === registeredNode.providerId)?.displayName ??
              `Provider #${registeredNode.providerId}`,
            nodeId: registeredNode.id,
            nodeKind: registeredNode.kind,
            externalId: registeredNode.externalId,
            displayName: registeredNode.displayName,
            operationId: receipt.operationId,
            savedAt: receipt.appliedAt,
          };
          saveRetainedNodeMetadata(captured.actorId, captured.zoneCode, retainedRecord);
          setRetainedNode(retainedRecord);
          setSubflow({
            view: 'REGISTER_STREAM',
            prefillNode: retainedRecord,
            returnToPicker: options?.returnToPicker,
          });
          return;
        }

        const registeredStream = extractReceiptStream(receipt.after);
        if (command.kind === 'REGISTER_STREAM' && registeredStream) {
          clearRetainedNodeMetadata(captured.actorId, captured.zoneCode);
          setRetainedNode(null);
          if (options?.returnToPicker) {
            const newStreamIdNum = Number(registeredStream.id);
            setSubflow({
              view: 'PICKER',
              ...options.returnToPicker,
            });
            if (Number.isSafeInteger(newStreamIdNum)) {
              void loadPickerStreams().then(() => selectAndRefreshStream(newStreamIdNum));
            } else {
              void loadPickerStreams();
            }
            return;
          }
          setSubflow({
            view: 'RECEIPT_RESULT',
            receipt,
            pendingRecord,
            liveStatusError: null,
          });
          return;
        }

        // For ASSIGN / REPLACE / DISABLE: fetch live zone status independently (do not fail receipt on 503!)
        let liveStatusErr: ParsedZoneSourceError | null = null;
        try {
          const freshStatus = await getZoneSourceStatus(captured.zoneCode, { limit: 20 });
          if (!isSameScope(captured)) return;
          setStatusData(freshStatus);
          setStatusError(null);
        } catch (refreshErr) {
          if (!isSameScope(captured)) return;
          liveStatusErr = parseZoneSourceApiError(refreshErr);
        }

        if (!isSameScope(captured)) return;

        if (historySensorId && 'sensorId' in command && command.sensorId === historySensorId) {
          void loadHistory(historySensorId);
        }

        if (!isSameScope(captured)) return;

        setSubflow({
          view: 'RECEIPT_RESULT',
          receipt,
          pendingRecord,
          liveStatusError: liveStatusErr,
        });
      } catch (err) {
        if (!isSameScope(captured)) return;
        const parsed = parseZoneSourceApiError(err);

        // Definite failures clear the pending op unless timeout/503/network
        if (parsed.isNetworkOrTimeout) {
          const unknownRecord: StoredPendingZoneSourceOperation = {
            ...pendingRecord,
            phase: 'UNKNOWN_OUTCOME',
            updatedAt: new Date().toISOString(),
          };
          savePendingZoneSourceOperation(unknownRecord);
          setSubflow({
            view: 'UNKNOWN',
            pendingRecord: unknownRecord,
            receipt404: false,
            error: parsed,
          });
          return;
        }

        clearPendingZoneSourceOperation(captured.actorId, captured.zoneCode);

        if (parsed.isConflict && (command.kind === 'ASSIGN' || command.kind === 'REPLACE' || command.kind === 'DISABLE')) {
          // Refresh latest state for side-by-side 409 conflict table
          let latestStreamDetail: StreamDiscovery | null = null;
          let latestAssignment: ZoneSourceAssignmentItem | null = null;
          try {
            if ('newStreamId' in command) {
              const sidNum = Number(command.newStreamId);
              if (Number.isSafeInteger(sidNum)) {
                latestStreamDetail = await getSafeSourceStreamDetail(sidNum);
              }
            }
            const freshStatus = await getZoneSourceStatus(captured.zoneCode, { limit: 20 });
            if (isSameScope(captured)) {
              setStatusData(freshStatus);
              if ('sensorId' in command) {
                const targetSensor = freshStatus.items.find(s => s.sensorId === command.sensorId);
                const streamIdToFind = 'oldStreamId' in command ? command.oldStreamId : command.newStreamId;
                latestAssignment =
                  targetSensor?.currentAssignments.find(a => a.streamId === streamIdToFind) ?? null;
              }
            }
          } catch {
            // keep latest null if refresh failed
          }
          if (!isSameScope(captured)) return;
          setSubflow({
            view: 'CONFLICT',
            error: parsed,
            pendingRecord,
            latestStreamDetail,
            latestAssignment,
          });
          return;
        }

        setInlineSubmitError(parsed);
      } finally {
        if (isSameScope(captured)) {
          setSubmitting(false);
        }
      }
    },
    [
      historySensorId,
      isOwner,
      isSameScope,
      loadHistory,
      loadPickerStreams,
      providers,
      selectAndRefreshStream,
    ]
  );

  const checkPendingReceipt = useCallback(
    async (pending: StoredPendingZoneSourceOperation) => {
      const captured = { ...scopeRef.current };
      if (!captured.isOpen || !captured.zoneCode || !captured.actorId || isOwner) return;

      setCheckingReceipt(true);
      try {
        const receipt = await getZoneSourceOperation(pending.operationId);
        if (!isSameScope(captured)) return;

        clearPendingZoneSourceOperation(captured.actorId, captured.zoneCode);
        setFormDirty(false);

        let liveStatusErr: ParsedZoneSourceError | null = null;
        try {
          const freshStatus = await getZoneSourceStatus(captured.zoneCode, { limit: 20 });
          if (!isSameScope(captured)) return;
          setStatusData(freshStatus);
          setStatusError(null);
        } catch (refreshErr) {
          if (!isSameScope(captured)) return;
          liveStatusErr = parseZoneSourceApiError(refreshErr);
        }

        // FENCE: Discard stale receipt if scope, role, or actor changed (R1-F1)
        if (!isSameScope(captured)) return;

        const registeredNode = extractReceiptNode(receipt.after);
        if (receipt.kind === 'REGISTER_NODE' && registeredNode) {
          if (!isSameScope(captured)) return;
          const retainedRecord: RetainedNodeMetadata = {
            actorId: captured.actorId,
            providerId: registeredNode.providerId,
            providerLabel:
              pending.targetSnapshot?.providerLabel ?? `Provider #${registeredNode.providerId}`,
            nodeId: registeredNode.id,
            nodeKind: registeredNode.kind,
            externalId: registeredNode.externalId,
            displayName: registeredNode.displayName,
            operationId: receipt.operationId,
            savedAt: receipt.appliedAt,
          };
          saveRetainedNodeMetadata(captured.actorId, captured.zoneCode, retainedRecord);
          setRetainedNode(retainedRecord);
        }

        const registeredStream = extractReceiptStream(receipt.after);
        if (receipt.kind === 'REGISTER_STREAM' && registeredStream) {
          if (!isSameScope(captured)) return;
          clearRetainedNodeMetadata(captured.actorId, captured.zoneCode);
          setRetainedNode(null);
        }

        if (!isSameScope(captured)) return;

        setSubflow({
          view: 'RECEIPT_RESULT',
          receipt,
          pendingRecord: pending,
          liveStatusError: liveStatusErr,
        });
      } catch (err) {
        if (!isSameScope(captured)) return;
        const parsed = parseZoneSourceApiError(err);
        if (parsed.isNotFound || parsed.code === 'ZS_OPERATION_NOT_FOUND') {
          const updated: StoredPendingZoneSourceOperation = {
            ...pending,
            phase: 'RECEIPT_404',
            updatedAt: new Date().toISOString(),
          };
          savePendingZoneSourceOperation(updated);
          setSubflow({
            view: 'UNKNOWN',
            pendingRecord: updated,
            receipt404: true,
            error: parsed,
          });
        } else {
          setSubflow({
            view: 'UNKNOWN',
            pendingRecord: pending,
            receipt404: pending.phase === 'RECEIPT_404',
            error: parsed,
          });
        }
      } finally {
        if (isSameScope(captured)) setCheckingReceipt(false);
      }
    },
    [isOwner, isSameScope]
  );

  const retrySamePendingRequest = useCallback(
    (pending: StoredPendingZoneSourceOperation) => {
      void submitCommand(pending.command, pending.targetSnapshot, {
        reusingPending: pending,
      });
    },
    [submitCommand]
  );

  const selectTab = useCallback((tab: DrawerTab) => {
    configureGenerationRef.current += 1;
    configureAbortRef.current?.abort();
    selectionGenerationRef.current += 1;
    setActiveTab(tab);
  }, []);

  const requestCloseDrawer = useCallback(() => {
    configureGenerationRef.current += 1;
    configureAbortRef.current?.abort();
    selectionGenerationRef.current += 1;
    if (submitting || checkingReceipt || subflow.view === 'UNKNOWN' || formDirty) {
      setLeaveIntent('CLOSE');
      setLeaveConfirmOpen(true);
      return;
    }
    onClose();
  }, [checkingReceipt, formDirty, onClose, subflow.view, submitting]);

  const confirmLeave = useCallback(() => {
    configureGenerationRef.current += 1;
    configureAbortRef.current?.abort();
    selectionGenerationRef.current += 1;
    setLeaveConfirmOpen(false);
    if (leaveIntent === 'BACK') {
      setFormDirty(false);
      setInlineSubmitError(null);
      setSubflow({ view: 'MAIN' });
    } else {
      onClose();
    }
    setLeaveIntent(null);
  }, [leaveIntent, onClose]);

  const cancelLeave = useCallback(() => {
    setLeaveConfirmOpen(false);
    setLeaveIntent(null);
  }, []);

  const navigateBackToMain = useCallback(() => {
    configureGenerationRef.current += 1;
    configureAbortRef.current?.abort();
    selectionGenerationRef.current += 1;
    if (subflow.view === 'REGISTER_STREAM' && retainedNode && !formDirty) {
      setSubflow({
        view: 'PARTIAL_NODE_RETAINED',
        retainedNode,
        returnToPicker: subflow.returnToPicker,
      });
      return;
    }
    if (formDirty || submitting) {
      setLeaveIntent('BACK');
      setLeaveConfirmOpen(true);
      return;
    }
    setInlineSubmitError(null);
    setSubflow({ view: 'MAIN' });
  }, [formDirty, retainedNode, subflow, submitting]);

  const openPickerForSensor = useCallback(
    (
      sensor: ZoneSourceStatusSensorItem,
      mode: 'ASSIGN' | 'REPLACE',
      replacingAssignment?: ZoneSourceAssignmentItem
    ) => {
      configureGenerationRef.current += 1;
      configureAbortRef.current?.abort();
      selectionGenerationRef.current += 1;
      setInlineSubmitError(null);
      setFilterSensorType(sensor.sensorType);
      setFilterProviderId('ALL');
      setFilterAdapterKind('ALL');
      setFilterIncludeRetired(false);
      setFilterSearch('');
      setSubflow({
        view: 'PICKER',
        targetSensorId: sensor.sensorId,
        mode,
        replacingAssignment,
      });
      void loadProvidersAndContract();
      void loadPickerStreams({
        providerId: 'ALL',
        sensorType: sensor.sensorType,
        includeRetired: false,
      });
    },
    [loadPickerStreams, loadProvidersAndContract]
  );

  const openConfigureForAssignment = useCallback(
    async (
      sensor: ZoneSourceStatusSensorItem,
      assignment: ZoneSourceAssignmentItem
    ) => {
      setInlineSubmitError(null);
      const captured = { ...scopeRef.current };
      const configureGen = ++configureGenerationRef.current;
      configureAbortRef.current?.abort();
      const controller = new AbortController();
      configureAbortRef.current = controller;

      const streamNum = Number(assignment.streamId);

      if (!Number.isSafeInteger(streamNum)) {
        // Fail closed on unsafe integer ID without fabricating synthetic detail
        setInlineSubmitError(
          parseZoneSourceApiError(new Error(`UNSAFE_NUMERIC_ID: ${assignment.streamId}`))
        );
        return;
      }

      try {
        const detail = await getSafeSourceStreamDetail(streamNum, controller.signal);
        if (configureGen !== configureGenerationRef.current || !isSameScope(captured)) return;
        setSubflow({
          view: 'ASSIGN_OR_REPLACE',
          mode: 'CONFIGURE',
          targetSensor: sensor,
          streamDetail: detail,
          currentAssignment: assignment,
        });
        if (detail.provider.adapterKind === 'IOTLAB_HTTP') {
          void loadIotLabMappings();
        } else {
          void loadProvidersAndContract();
        }
      } catch (err) {
        if (configureGen !== configureGenerationRef.current || !isSameScope(captured)) return;
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { code?: string })?.code === 'ERR_CANCELED') {
          return;
        }
        // Fail closed on detail failure (503 / network / retired) without synthetic submission fallback
        setInlineSubmitError(parseZoneSourceApiError(err));
      }
    },
    [isSameScope, loadIotLabMappings, loadProvidersAndContract]
  );

  const proceedFromPickerToAssignOrReplace = useCallback(
    async (
      targetSensor: ZoneSourceStatusSensorItem,
      mode: 'ASSIGN' | 'REPLACE',
      streamId: number,
      replacingAssignment?: ZoneSourceAssignmentItem
    ) => {
      const captured = { ...scopeRef.current };
      const continuationGen = ++configureGenerationRef.current;
      configureAbortRef.current?.abort();
      const controller = new AbortController();
      configureAbortRef.current = controller;

      const freshDetail = await selectAndRefreshStream(streamId);
      if (continuationGen !== configureGenerationRef.current || !isSameScope(captured)) return;
      if (!freshDetail) return;

      if (freshDetail.provider.adapterKind === 'IOTLAB_HTTP') {
        void loadIotLabMappings();
      }
      if (continuationGen !== configureGenerationRef.current || !isSameScope(captured)) return;

      setInlineSubmitError(null);
      setSubflow({
        view: 'ASSIGN_OR_REPLACE',
        mode,
        targetSensor,
        streamDetail: freshDetail,
        replacingAssignment,
      });
    },
    [isSameScope, loadIotLabMappings, selectAndRefreshStream]
  );

  const createNewOperationId = useCallback(() => generateZoneSourceOperationId(), []);

  const dismissRetainedNode = useCallback(() => {
    configureGenerationRef.current += 1;
    configureAbortRef.current?.abort();
    selectionGenerationRef.current += 1;
    if (actorDecimalId && zoneCode) {
      clearRetainedNodeMetadata(actorDecimalId, zoneCode);
    }
    setRetainedNode(null);
    setSubflow({ view: 'MAIN' });
  }, [actorDecimalId, zoneCode]);

  const makeTargetSnapshot = useCallback(
    (
      sensor: ZoneSourceStatusSensorItem,
      stream: StreamDiscovery,
      assignment: ZoneSourceAssignmentItem | null,
      replacing?: ZoneSourceAssignmentItem
    ): TargetAssignmentSnapshot => {
      const adapter =
        stream.provider.adapterKind ?? (stream.nodeId !== null ? 'IOTLAB_HTTP' : 'MQTT');
      return {
        streamId: assignment ? assignment.streamId : toDecimalId(stream.id, 'stream.id'),
        streamLabel: `${stream.sensorType} #${assignment ? assignment.streamId : stream.id}`,
        providerLabel: stream.provider.displayName || stream.provider.code,
        sensorId: sensor.sensorId,
        sensorLabel: `${sensor.sensorType} #${sensor.sensorId} (${sensor.unit})`,
        assignmentId: assignment?.assignmentId ?? (stream.currentAssignment ? toDecimalId(stream.currentAssignment.id, 'assignment.id') : null),
        version: assignment?.latestAssignmentVersion ?? toDecimalVersion(stream.latestAssignmentVersion ?? 0, 'stream.version'),
        assignmentState: assignment
          ? assignment.assignmentState
          : stream.currentAssignment
          ? stream.currentAssignment.effectiveTo === null
            ? 'OPEN'
            : 'CLOSED'
          : 'NONE',
        adapterKind: adapter,
        mqttTopic: assignment?.mqttTopic ?? null,
        mappingId: assignment?.mapping?.id ?? null,
        mappingVersion: assignment?.mapping?.version ?? null,
        oldStreamLabel: replacing ? `${replacing.publicProviderLabel} #${replacing.streamId}` : null,
        oldAssignmentId: replacing?.assignmentId ?? null,
      };
    },
    []
  );

  return {
    activeTab,
    setActiveTab: selectTab,
    subflow,
    setSubflow,
    expandedSensorIds,
    setExpandedSensorIds,
    formDirty,
    setFormDirty,
    leaveConfirmOpen,
    leaveIntent,
    requestCloseDrawer,
    confirmLeave,
    cancelLeave,
    navigateBackToMain,
    statusLoading,
    statusLoadingMore,
    statusData,
    statusError,
    fallbackSensors,
    loadSourceStatus,
    historySensorId,
    setHistorySensorId,
    historyLoading,
    historyLoadingMore,
    historyItems,
    historyNextAfterId,
    historyError,
    loadHistory,
    providers,
    providersLoading,
    pickerStreams,
    pickerNextAfterId,
    pickerLoading,
    pickerLoadingMore,
    pickerError,
    selectedPickerStreamId,
    selectedStreamDetail,
    streamDetailLoading,
    streamDetailError,
    filterProviderId,
    setFilterProviderId,
    filterAdapterKind,
    setFilterAdapterKind,
    filterSensorType,
    setFilterSensorType,
    filterIncludeRetired,
    setFilterIncludeRetired,
    filterSearch,
    setFilterSearch,
    loadProvidersAndContract,
    loadPickerStreams,
    selectAndRefreshStream,
    nodes,
    nodesNextAfterId,
    nodesLoading,
    nodesError,
    loadNodesForProvider,
    routingContract,
    iotLabMappings,
    iotLabMappingsLoading,
    iotLabMappingsError,
    loadIotLabMappings,
    retainedNode,
    dismissRetainedNode,
    submitting,
    checkingReceipt,
    storageUnavailable,
    inlineSubmitError,
    setInlineSubmitError,
    submitCommand,
    checkPendingReceipt,
    retrySamePendingRequest,
    openPickerForSensor,
    openConfigureForAssignment,
    proceedFromPickerToAssignOrReplace,
    createNewOperationId,
    makeTargetSnapshot,
  };
}
