import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage, resolveClosedAssignmentId } from '../../api/zoneSource';
import type { RoutingContract, StreamDiscovery } from '../../types/farmVisual';
import {
  isExactUnitMatch,
  isSafeNumericId,
  isSafeNumericVersion,
  toDecimalId,
  toDecimalVersion,
  type AssignIotLabOperationRequest,
  type AssignMqttOperationRequest,
  type DecimalId,
  type IotLabMappingAdminItem,
  type ParsedZoneSourceError,
  type ReplaceIotLabOperationRequest,
  type ReplaceMqttOperationRequest,
  type TargetAssignmentSnapshot,
  type ZoneSourceAssignmentItem,
  type ZoneSourceOperationRequest,
  type ZoneSourceStatusSensorItem,
} from '../../types/zoneSource';
import {
  formatTextValidationMessage,
  validateStrictText,
  validateThreeLevelMqttTopic,
  validateZoneSourceOperationRequest,
} from '../../utils/zoneSourceValidation';
import {
  formatSensorUnit,
  getMappingStateMeta,
  getSensorTypeDisplayName,
} from './zoneSourceLabels';

interface ZoneSourceAssignOrReplaceViewProps {
  mode: 'ASSIGN' | 'CONFIGURE' | 'REPLACE';
  zoneCode: string;
  farmId?: number | null;
  zoneId?: number | string | null;
  targetSensor: ZoneSourceStatusSensorItem;
  streamDetail: StreamDiscovery;
  currentAssignment?: ZoneSourceAssignmentItem;
  replacingAssignment?: ZoneSourceAssignmentItem;
  routingContract: RoutingContract | null;
  iotLabMappings: IotLabMappingAdminItem[];
  iotLabMappingsLoading: boolean;
  iotLabMappingsError: ParsedZoneSourceError | null;
  submitting: boolean;
  storageUnavailable: boolean;
  serverError: ParsedZoneSourceError | null;
  operationId: string;
  onDirtyChange: (dirty: boolean) => void;
  onSubmit: (
    command: ZoneSourceOperationRequest,
    snapshot: TargetAssignmentSnapshot
  ) => void;
  onCancel: () => void;
  makeTargetSnapshot: (
    sensor: ZoneSourceStatusSensorItem,
    stream: StreamDiscovery,
    assignment: ZoneSourceAssignmentItem | null,
    replacing?: ZoneSourceAssignmentItem
  ) => TargetAssignmentSnapshot;
}

export default function ZoneSourceAssignOrReplaceView({
  mode,
  zoneCode,
  zoneId,
  targetSensor,
  streamDetail,
  currentAssignment,
  replacingAssignment,
  routingContract,
  iotLabMappings,
  iotLabMappingsLoading,
  iotLabMappingsError,
  submitting,
  storageUnavailable,
  serverError,
  operationId,
  onDirtyChange,
  onSubmit,
  onCancel,
  makeTargetSnapshot,
}: ZoneSourceAssignOrReplaceViewProps) {
  const isIotLab = streamDetail.provider.adapterKind === 'IOTLAB_HTTP';

  const derivedMqttTopic = useMemo(() => {
    if (currentAssignment?.mqttTopic) return currentAssignment.mqttTopic;
    if (streamDetail.externalNamespace.startsWith('TOPIC:')) {
      return streamDetail.externalNamespace.slice(6);
    }
    if (routingContract?.defaultTopic) return routingContract.defaultTopic;
    return `durian/${zoneCode}/sensors`;
  }, [currentAssignment?.mqttTopic, routingContract?.defaultTopic, streamDetail.externalNamespace, zoneCode]);

  // Evaluate candidate IoTLab mapping (unconditional dependency on currentAssignment.mapping removed)
  const iotLabEvaluation = useMemo(() => {
    if (!isIotLab) return null;

    // Case 1: Stream already has an assigned mapping (e.g. CONFIGURE or REPLACE of existing bound stream)
    if (currentAssignment?.mapping) {
      const mapping = currentAssignment.mapping;
      if (!isSafeNumericId(mapping.id) || !isSafeNumericVersion(mapping.version)) {
        return {
          kind: 'INVALID_METADATA' as const,
          mappingId: '',
          version: '',
          expectedExternalSensorId: null,
          expectedUnit: targetSensor.unit,
          state: 'DISABLED' as const,
          enabled: false,
          isBlocked: true,
          blockReason: t('Dữ liệu mapping hiện tại chứa mã nhận diện hoặc phiên bản không an toàn.'),
        };
      }
      const adminMatch = iotLabMappings.find(m => String(m.id) === String(mapping.id)) ?? null;
      const isUnitMismatch = !isExactUnitMatch(currentAssignment.expectedUnit, targetSensor.unit);
      return {
        kind: 'EXISTING_BOUND' as const,
        mappingId: String(mapping.id),
        version: String(mapping.version),
        expectedExternalSensorId: currentAssignment.expectedExternalSensorId ?? null,
        expectedUnit: currentAssignment.expectedUnit ?? targetSensor.unit,
        state: mapping.state ?? adminMatch?.state ?? 'READY',
        enabled: adminMatch?.enabled ?? false,
        isBlocked: isUnitMismatch,
        blockReason: isUnitMismatch
          ? t(
              "Đơn vị đo của mapping ('{0}') không khớp chính xác với đơn vị đo của cảm biến ('{1}'). Hợp đồng hệ thống yêu cầu đơn vị đo phải khớp tuyệt đối (ví dụ: %rH không tương đương %, °C không tương đương C). Giao dịch bị chặn.",
              [currentAssignment.expectedUnit ?? '', targetSensor.unit]
            )
          : null,
      };
    }

    // Case 2: Initial IoTLab assignment (streamDetail is unbound in registry)
    const stationExt = streamDetail.node?.externalId;
    const streamExt = streamDetail.externalId;

    if (!stationExt || !streamExt) {
      return {
        kind: 'INCOMPLETE_METADATA' as const,
        mappingId: '',
        version: '',
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Dữ liệu luồng IoTLab thiếu mã trạm hoặc mã luồng ngoài để đối chiếu mapping.'),
      };
    }

    const matches = iotLabMappings.filter(m => {
      const stationMatches = String(m.stationId) === String(stationExt);
      const streamMatches = String(m.streamId) === String(streamExt);
      const typeMatches = m.sensorType === targetSensor.sensorType;
      const zoneMatches = zoneId == null || String(m.zoneId) === String(zoneId);
      return stationMatches && streamMatches && typeMatches && zoneMatches;
    });

    if (matches.length === 0) {
      return {
        kind: 'NO_MATCH' as const,
        mappingId: '',
        version: '',
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Không tìm thấy mapping IoTLab phù hợp với trạm #{0} và luồng #{1} trên Zone này.', [
          stationExt,
          streamExt,
        ]),
      };
    }

    if (matches.length > 1) {
      return {
        kind: 'AMBIGUOUS' as const,
        mappingId: '',
        version: '',
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t(
          'Tìm thấy nhiều hơn một mapping IoTLab trùng khớp cho trạm và luồng này. Để đảm bảo an toàn, hệ thống chặn gán tự động khi cấu hình không rõ ràng.'
        ),
      };
    }

    const candidate = matches[0];

    // F2: Validate numeric mapping ID and all identity fields before string conversion/comparison
    if (!isSafeNumericId(candidate.id)) {
      return {
        kind: 'INVALID_METADATA' as const,
        candidate,
        mappingId: '',
        version: '',
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Mã nhận diện (@Id) của mapping không phải là số nguyên an toàn.'),
      };
    }

    // Check candidate version
    if (!isSafeNumericVersion(candidate.version)) {
      return {
        kind: 'INVALID_VERSION' as const,
        candidate,
        mappingId: String(candidate.id),
        version: '',
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: candidate.state ?? 'DISABLED',
        enabled: candidate.enabled,
        isBlocked: true,
        blockReason: t('Phiên bản máy chủ (@Version) của mapping không khả dụng hoặc không an toàn.'),
      };
    }

    if (candidate.sourceStreamId != null && !isSafeNumericId(candidate.sourceStreamId)) {
      return {
        kind: 'INVALID_METADATA' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Mã nhận diện luồng liên kết (sourceStreamId) của mapping không phải là số nguyên an toàn.'),
      };
    }

    if (candidate.stationId != null && !isSafeNumericId(candidate.stationId)) {
      return {
        kind: 'INVALID_METADATA' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Mã trạm (stationId) của mapping không phải là số nguyên an toàn.'),
      };
    }

    if (candidate.streamId != null && !isSafeNumericId(candidate.streamId)) {
      return {
        kind: 'INVALID_METADATA' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Mã luồng (streamId) của mapping không phải là số nguyên an toàn.'),
      };
    }

    if (candidate.expectedSensorId != null && !isSafeNumericId(candidate.expectedSensorId)) {
      return {
        kind: 'INVALID_METADATA' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId: null,
        expectedUnit: targetSensor.unit,
        state: 'DISABLED' as const,
        enabled: false,
        isBlocked: true,
        blockReason: t('Mã cảm biến ngoài (expectedSensorId) của mapping không phải là số nguyên an toàn.'),
      };
    }

    // F4: Distinguish existing bound same-stream mapping from unbound initial adoption
    const isBoundToThisStream =
      candidate.sourceStreamId != null &&
      String(candidate.sourceStreamId) === String(streamDetail.id);

    if (candidate.sourceStreamId != null && !isBoundToThisStream) {
      return {
        kind: 'ALREADY_BOUND' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId:
          candidate.expectedSensorId != null ? String(candidate.expectedSensorId) : null,
        expectedUnit: candidate.expectedUnit ?? targetSensor.unit,
        state: candidate.state ?? 'READY',
        enabled: candidate.enabled,
        isBlocked: true,
        blockReason: t(
          'Mapping IoTLab đã được liên kết với một luồng khác trên hệ thống (sourceStreamId: #{0}). Không thể gán lại.',
          [String(candidate.sourceStreamId)]
        ),
      };
    }

    if (isBoundToThisStream) {
      // Mapping is already bound to this stream: allowed even if enabled
      const candidateUnit = candidate.expectedUnit ?? targetSensor.unit;
      const isUnitMismatch = !isExactUnitMatch(candidate.expectedUnit, targetSensor.unit);
      if (isUnitMismatch) {
        return {
          kind: 'UNIT_MISMATCH' as const,
          candidate,
          mappingId: String(candidate.id),
          version: String(candidate.version),
          expectedExternalSensorId:
            candidate.expectedSensorId != null ? String(candidate.expectedSensorId) : null,
          expectedUnit: candidateUnit,
          state: candidate.state ?? 'READY',
          enabled: candidate.enabled,
          isBlocked: true,
          blockReason: t(
            "Đơn vị đo của mapping ('{0}') không khớp chính xác với đơn vị đo của cảm biến ('{1}'). Hợp đồng hệ thống yêu cầu đơn vị đo phải khớp tuyệt đối (ví dụ: %rH không tương đương %, °C không tương đương C). Giao dịch bị chặn.",
            [candidate.expectedUnit ?? '', targetSensor.unit]
          ),
        };
      }

      return {
        kind: 'EXISTING_BOUND' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId:
          candidate.expectedSensorId != null ? String(candidate.expectedSensorId) : null,
        expectedUnit: candidateUnit,
        state: candidate.state ?? 'READY',
        enabled: candidate.enabled,
        isBlocked: false,
        blockReason: null,
      };
    }

    // Initial unbound candidate: must be disabled and unbound
    if (candidate.enabled) {
      return {
        kind: 'ENABLED_NOT_ALLOWED' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId:
          candidate.expectedSensorId != null ? String(candidate.expectedSensorId) : null,
        expectedUnit: candidate.expectedUnit ?? targetSensor.unit,
        state: candidate.state ?? 'READY',
        enabled: true,
        isBlocked: true,
        blockReason: t(
          'Mapping IoTLab đang ở trạng thái kích hoạt (enabled). Chỉ mapping chưa kích hoạt (disabled) và chưa liên kết mới có thể gán nguồn ban đầu.'
        ),
      };
    }

    // Check exact unit match (no conversion, exact string equality)
    const candidateUnit = candidate.expectedUnit ?? targetSensor.unit;
    if (!isExactUnitMatch(candidate.expectedUnit, targetSensor.unit)) {
      return {
        kind: 'UNIT_MISMATCH' as const,
        candidate,
        mappingId: String(candidate.id),
        version: String(candidate.version),
        expectedExternalSensorId:
          candidate.expectedSensorId != null ? String(candidate.expectedSensorId) : null,
        expectedUnit: candidateUnit,
        state: candidate.state ?? 'DISABLED',
        enabled: false,
        isBlocked: true,
        blockReason: t(
          "Đơn vị đo của mapping ('{0}') không khớp chính xác với đơn vị đo của cảm biến ('{1}'). Hợp đồng hệ thống yêu cầu đơn vị đo phải khớp tuyệt đối (ví dụ: %rH không tương đương %, °C không tương đương C). Giao dịch bị chặn.",
          [candidate.expectedUnit ?? '', targetSensor.unit]
        ),
      };
    }

    // Eligible initial candidate!
    return {
      kind: 'ELIGIBLE_INITIAL' as const,
      candidate,
      mappingId: String(candidate.id),
      version: String(candidate.version),
      expectedExternalSensorId:
        candidate.expectedSensorId != null ? String(candidate.expectedSensorId) : null,
      expectedUnit: candidateUnit,
      state: candidate.state ?? 'DISABLED',
      enabled: false,
      isBlocked: false,
      blockReason: null,
    };
  }, [
    currentAssignment?.mapping,
    iotLabMappings,
    isIotLab,
    streamDetail.externalId,
    streamDetail.id,
    streamDetail.node?.externalId,
    targetSensor.sensorType,
    targetSensor.unit,
    zoneId,
  ]);

  const [mqttTopic] = useState<string>(derivedMqttTopic);
  const [expectedUnit, setExpectedUnit] = useState<string>(
    currentAssignment?.expectedUnit ??
      iotLabEvaluation?.expectedUnit ??
      targetSensor.unit
  );
  const [expectedExternalSensorId, setExpectedExternalSensorId] = useState<string>(() => {
    if (currentAssignment?.expectedExternalSensorId) {
      return currentAssignment.expectedExternalSensorId;
    }
    if (iotLabEvaluation?.expectedExternalSensorId != null) {
      return String(iotLabEvaluation.expectedExternalSensorId);
    }
    return '';
  });
  // F1: Check if this stream is already bound (either via currentAssignment or same-stream existing bound mapping)
  const isAlreadyBound = Boolean(currentAssignment?.mapping) || iotLabEvaluation?.kind === 'EXISTING_BOUND';
  const [bindIfUnbound, setBindIfUnbound] = useState<boolean>(true);
  const isBindingConsentMissing = Boolean(isIotLab && !isAlreadyBound && !bindIfUnbound);

  const [reactivatePolling, setReactivatePolling] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // F5: Target key for CLOSED resolution to bind resolution state to the exact mounted target key
  const currentTargetKey = `${zoneCode}:${targetSensor.sensorId}:${streamDetail.id}:${streamDetail.latestAssignmentVersion ?? 0}`;
  const [resolvedClosedAssignmentId, setResolvedClosedAssignmentId] = useState<DecimalId | null>(null);
  const [resolvedTargetKey, setResolvedTargetKey] = useState<string | null>(null);
  const [closedResolutionStatus, setClosedResolutionStatus] = useState<
    'IDLE' | 'RESOLVING' | 'FOUND' | 'NOT_FOUND' | 'BUDGET_EXHAUSTED' | 'ERROR'
  >('IDLE');
  const [closedResolutionError, setClosedResolutionError] = useState<string | null>(null);

  useEffect(() => {
    if (!expectedExternalSensorId && iotLabEvaluation?.expectedExternalSensorId != null) {
      setExpectedExternalSensorId(String(iotLabEvaluation.expectedExternalSensorId));
    }
    if (iotLabEvaluation?.expectedUnit && expectedUnit === targetSensor.unit) {
      setExpectedUnit(iotLabEvaluation.expectedUnit);
    }
  }, [
    expectedExternalSensorId,
    expectedUnit,
    iotLabEvaluation?.expectedExternalSensorId,
    iotLabEvaluation?.expectedUnit,
    targetSensor.unit,
  ]);

  useEffect(() => {
    onDirtyChange(Boolean(reason));
  }, [onDirtyChange, reason]);

  const effectiveMappingState = iotLabEvaluation?.state ?? null;

  const newStreamIdStr = currentAssignment
    ? currentAssignment.streamId
    : toDecimalId(streamDetail.id, 'stream.id');
  const newExpectedVersionStr = currentAssignment
    ? currentAssignment.latestAssignmentVersion ?? currentAssignment.version
    : toDecimalVersion(streamDetail.latestAssignmentVersion ?? 0, 'stream.version');

  const streamVersionNum = Number(
    currentAssignment?.latestAssignmentVersion ??
      currentAssignment?.version ??
      streamDetail.latestAssignmentVersion ??
      0
  );

  let expectedCurrentState: 'OPEN' | 'NONE' | 'CLOSED' = 'NONE';
  let expectedCurrentAssignmentId: DecimalId | null = null;

  if (currentAssignment) {
    expectedCurrentAssignmentId = currentAssignment.assignmentId;
    expectedCurrentState =
      currentAssignment.assignmentState === 'CLOSED' || currentAssignment.effectiveTo !== null
        ? 'CLOSED'
        : 'OPEN';
  } else if (streamDetail.currentAssignment) {
    expectedCurrentAssignmentId = toDecimalId(streamDetail.currentAssignment.id, 'assignment.id');
    expectedCurrentState =
      streamDetail.currentAssignment.effectiveTo === null ? 'OPEN' : 'CLOSED';
  } else if (streamVersionNum === 0) {
    expectedCurrentState = 'NONE';
    expectedCurrentAssignmentId = null;
  } else {
    // CLOSED: streamVersionNum > 0 and currentAssignment is null
    expectedCurrentState = 'CLOSED';
    // F5: Synchronously invalidate effective resolved CLOSED ID if the target key doesn't match
    expectedCurrentAssignmentId =
      closedResolutionStatus === 'FOUND' && resolvedTargetKey === currentTargetKey
        ? resolvedClosedAssignmentId
        : null;
  }

  // Resolve CLOSED assignment history across pages using bounded cursor budget
  useEffect(() => {
    if (
      expectedCurrentState !== 'CLOSED' ||
      currentAssignment != null ||
      streamDetail.currentAssignment != null
    ) {
      setResolvedClosedAssignmentId(null);
      setResolvedTargetKey(null);
      setClosedResolutionStatus('IDLE');
      setClosedResolutionError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    // F5: Clear any previous target's resolution state synchronously before starting
    setResolvedClosedAssignmentId(null);
    setResolvedTargetKey(null);
    setClosedResolutionStatus('RESOLVING');
    setClosedResolutionError(null);

    void (async () => {
      try {
        const result = await resolveClosedAssignmentId(
          zoneCode,
          targetSensor.sensorId,
          streamDetail.id,
          streamDetail.latestAssignmentVersion ?? 0,
          { maxPages: 5, pageSize: 20, signal: controller.signal }
        );

        if (!isMounted) return;

        if (result.status === 'FOUND' && result.assignmentId) {
          setResolvedClosedAssignmentId(result.assignmentId);
          setResolvedTargetKey(currentTargetKey);
          setClosedResolutionStatus('FOUND');
        } else if (result.status === 'NOT_FOUND') {
          setResolvedClosedAssignmentId(null);
          setResolvedTargetKey(null);
          setClosedResolutionStatus('NOT_FOUND');
          setClosedResolutionError(
            t(
              'Không tìm thấy bản ghi lịch sử đã đóng phù hợp với luồng #{0} và phiên bản v{1} trên cảm biến này. Không thể liên kết lại (HANDOFF_REVIEW_REQUIRED).',
              [String(streamDetail.id), String(streamDetail.latestAssignmentVersion ?? 0)]
            )
          );
        } else if (result.status === 'BUDGET_EXHAUSTED') {
          setResolvedClosedAssignmentId(null);
          setResolvedTargetKey(null);
          setClosedResolutionStatus('BUDGET_EXHAUSTED');
          setClosedResolutionError(
            t(
              'Vượt quá giới hạn tra cứu lịch sử ({0} trang) mà không tìm thấy mã phân bổ phù hợp. Yêu cầu kiểm tra lại cấu hình (HANDOFF_REVIEW_REQUIRED).',
              [5]
            )
          );
        } else {
          setResolvedClosedAssignmentId(null);
          setResolvedTargetKey(null);
          setClosedResolutionStatus('ERROR');
          setClosedResolutionError(t('Lỗi khi tra cứu lịch sử gán nguồn. Vui lòng thử lại.'));
        }
      } catch (err) {
        if (!isMounted) return;
        if (
          (err as { name?: string })?.name === 'CanceledError' ||
          (err as { code?: string })?.code === 'ERR_CANCELED'
        ) {
          return;
        }
        setResolvedClosedAssignmentId(null);
        setResolvedTargetKey(null);
        setClosedResolutionStatus('ERROR');
        setClosedResolutionError(t('Lỗi khi tra cứu lịch sử gán nguồn. Vui lòng thử lại.'));
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
      setResolvedClosedAssignmentId(null);
      setResolvedTargetKey(null);
    };
  }, [
    currentAssignment,
    currentTargetKey,
    expectedCurrentState,
    streamDetail.currentAssignment,
    streamDetail.id,
    streamDetail.latestAssignmentVersion,
    t,
    targetSensor.sensorId,
    zoneCode,
  ]);

  const isClosedResolving =
    expectedCurrentState === 'CLOSED' &&
    (closedResolutionStatus === 'RESOLVING' || resolvedTargetKey !== currentTargetKey);
  const isClosedAssignmentIdMissing =
    expectedCurrentState === 'CLOSED' && expectedCurrentAssignmentId === null;
  const isIotLabBlocked = Boolean(isIotLab && iotLabEvaluation?.isBlocked);
  // F3: Invalidate readiness during mapping refresh or on error
  const isIotLabLoading = Boolean(isIotLab && iotLabMappingsLoading);
  const isIotLabError = Boolean(isIotLab && iotLabMappingsError);
  // F1: Block if binding consent is missing
  const isSubmissionBlocked =
    isClosedResolving ||
    isClosedAssignmentIdMissing ||
    isIotLabBlocked ||
    isIotLabLoading ||
    isIotLabError ||
    isBindingConsentMissing;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storageUnavailable || submitting || isSubmissionBlocked) return;

    const nextErrors: Record<string, string> = {};
    const unitNorm = expectedUnit === '' ? null : expectedUnit;
    const unitErr = validateStrictText(unitNorm, {
      nullable: true,
      maxLength: 64,
      allowBlank: false,
      allowControls: false,
    });
    if (unitErr !== 'OK') {
      nextErrors.expectedUnit = formatTextValidationMessage(t('Đơn vị đo kỳ vọng'), unitErr, 64, t);
    }

    const reasonErr = validateStrictText(reason, {
      nullable: false,
      maxLength: 1000,
      allowBlank: false,
      allowControls: false,
    });
    if (reasonErr !== 'OK') {
      nextErrors.reason = formatTextValidationMessage(t('Lý do thao tác'), reasonErr, 1000, t);
    }

    const candidateMappingId = iotLabEvaluation?.mappingId ?? '';
    const candidateMappingVersion = iotLabEvaluation?.version ?? '';

    if (!isIotLab) {
      const topicErr = validateThreeLevelMqttTopic(mqttTopic);
      if (topicErr) {
        nextErrors.mqttTopic = formatTextValidationMessage('Topic MQTT', topicErr, 1024, t);
      }
    } else {
      if (!candidateMappingId || !isSafeNumericId(candidateMappingId)) {
        nextErrors.mappingId = t('Chưa có thông tin mapping IoTLab hợp lệ.');
      }
      if (!candidateMappingVersion || !isSafeNumericVersion(candidateMappingVersion)) {
        nextErrors.expectedMappingVersion = t('Phiên bản mapping phải là số nguyên không âm hợp lệ.');
      }
      if (expectedExternalSensorId !== '') {
        const extErr = validateStrictText(expectedExternalSensorId, {
          nullable: false,
          maxLength: 255,
          allowBlank: false,
          allowControls: false,
        });
        if (extErr !== 'OK') {
          nextErrors.expectedExternalSensorId = formatTextValidationMessage(
            t('Mã cảm biến ngoài'),
            extErr,
            255,
            t
          );
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setClientErrors(nextErrors);
      return;
    }

    setClientErrors({});

    let command: ZoneSourceOperationRequest;
    if (mode === 'REPLACE' && replacingAssignment) {
      if (!isIotLab) {
        const payload: ReplaceMqttOperationRequest = {
          contractVersion: 'ZS-1',
          kind: 'REPLACE',
          operationId,
          zoneCode,
          sensorId: targetSensor.sensorId,
          oldStreamId: replacingAssignment.streamId,
          oldAssignmentId: replacingAssignment.assignmentId,
          oldExpectedVersion:
            replacingAssignment.latestAssignmentVersion ?? replacingAssignment.version,
          newStreamId: newStreamIdStr,
          newExpectedVersion: newExpectedVersionStr,
          expectedCurrentAssignmentId,
          expectedCurrentState,
          expectedUnit: unitNorm,
          expectedExternalSensorId: null,
          mqttTopic,
          reason,
          reactivatePolling: false,
        };
        command = payload;
      } else {
        const payload: ReplaceIotLabOperationRequest = {
          contractVersion: 'ZS-1',
          kind: 'REPLACE',
          operationId,
          zoneCode,
          sensorId: targetSensor.sensorId,
          oldStreamId: replacingAssignment.streamId,
          oldAssignmentId: replacingAssignment.assignmentId,
          oldExpectedVersion:
            replacingAssignment.latestAssignmentVersion ?? replacingAssignment.version,
          newStreamId: newStreamIdStr,
          newExpectedVersion: newExpectedVersionStr,
          expectedCurrentAssignmentId,
          expectedCurrentState,
          expectedUnit: unitNorm,
          expectedExternalSensorId:
            expectedExternalSensorId === '' ? null : expectedExternalSensorId,
          mqttTopic: null,
          mappingId: candidateMappingId,
          expectedMappingVersion: candidateMappingVersion,
          bindIfUnbound: isAlreadyBound ? false : bindIfUnbound,
          reason,
          reactivatePolling,
        };
        command = payload;
      }
    } else if (!isIotLab) {
      const payload: AssignMqttOperationRequest = {
        contractVersion: 'ZS-1',
        kind: 'ASSIGN',
        operationId,
        zoneCode,
        sensorId: targetSensor.sensorId,
        newStreamId: newStreamIdStr,
        newExpectedVersion: newExpectedVersionStr,
        expectedCurrentAssignmentId,
        expectedCurrentState,
        expectedUnit: unitNorm,
        expectedExternalSensorId: null,
        mqttTopic,
        reason,
        reactivatePolling: false,
      };
      command = payload;
    } else {
      const payload: AssignIotLabOperationRequest = {
        contractVersion: 'ZS-1',
        kind: 'ASSIGN',
        operationId,
        zoneCode,
        sensorId: targetSensor.sensorId,
        newStreamId: newStreamIdStr,
        newExpectedVersion: newExpectedVersionStr,
        expectedCurrentAssignmentId,
        expectedCurrentState,
        expectedUnit: unitNorm,
        expectedExternalSensorId:
          expectedExternalSensorId === '' ? null : expectedExternalSensorId,
        mqttTopic: null,
        mappingId: candidateMappingId,
        expectedMappingVersion: candidateMappingVersion,
        bindIfUnbound: isAlreadyBound ? false : bindIfUnbound,
        reason,
        reactivatePolling,
      };
      command = payload;
    }

    const contractCheck = validateZoneSourceOperationRequest(command, {
      adapterKind: isIotLab ? 'IOTLAB_HTTP' : 'MQTT',
    });
    if (!contractCheck.valid) {
      const mapped: Record<string, string> = {};
      for (const fe of contractCheck.fieldErrors) {
        mapped[fe.field] = `${fe.field}: ${fe.code}`;
      }
      setClientErrors(mapped);
      return;
    }

    const snapshot = makeTargetSnapshot(
      targetSensor,
      streamDetail,
      currentAssignment ?? null,
      replacingAssignment
    );
    onSubmit(command, snapshot);
  };

  const title =
    mode === 'REPLACE'
      ? t('Thay thế nguồn dữ liệu cảm biến')
      : mode === 'CONFIGURE'
        ? t('Cấu hình thông số nguồn cảm biến')
        : t('Gán nguồn dữ liệu cho cảm biến');

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="p-4 md:p-6 space-y-5"
      data-testid="zs-assign-replace-form"
    >
      {/* Title */}
      <div>
        <h2 className="text-base md:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          {title}
        </h2>
        <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
          {mode === 'REPLACE'
            ? t('Chuyển đổi luồng dữ liệu của cảm biến sang một nguồn đã kiểm tra tính phù hợp.')
            : t('Kiểm tra và xác nhận các tham số trước khi áp dụng cấu hình thu thập.')}
        </p>
      </div>

      {serverError && (
        <div
          data-testid="assign-server-error-banner"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 space-y-1"
        >
          <div className="font-bold">{t('Lỗi từ máy chủ ({0})', [serverError.code])}</div>
          <div>{getZoneSourceErrorMessage(serverError, t)}</div>
        </div>
      )}

      {/* REPLACE compare card */}
      {mode === 'REPLACE' && replacingAssignment && (
        <div
          data-testid="replace-comparison-card"
          className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs"
        >
          <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Đối chiếu nguồn thay thế')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-1">
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                {t('Nguồn đang gán hiện tại')}
              </div>
              <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {replacingAssignment.publicProviderLabel} (#{replacingAssignment.streamId})
              </div>
              <div className="font-mono text-[#64748B]">
                #{replacingAssignment.assignmentId} · v{replacingAssignment.version}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1">
              <div className="text-[11px] font-semibold text-[#1F5CA9] dark:text-[#60A5FA]">
                {t('Nguồn thay thế mới')}
              </div>
              <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {streamDetail.provider.displayName || streamDetail.provider.code} (#{newStreamIdStr})
              </div>
              <div className="font-mono text-[#64748B]">v{newExpectedVersionStr}</div>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
            {t('Các nguồn song song khác đang gán trên cảm biến này sẽ giữ nguyên không bị ảnh hưởng.')}
          </p>
        </div>
      )}

      {/* Fixed Sensor Summary */}
      <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {getSensorTypeDisplayName(targetSensor.sensorType, t)} (#{targetSensor.sensorId} · {formatSensorUnit(targetSensor.unit, t)})
          </span>
          <span className="h-[26px] px-2.5 rounded-[6px] bg-blue-50 dark:bg-blue-950/60 text-[#1F5CA9] dark:text-[#60A5FA] font-mono font-semibold inline-flex items-center">
            {isIotLab ? 'IOTLAB_HTTP' : 'MQTT'} · #{newStreamIdStr}
          </span>
        </div>
      </div>

      {storageUnavailable && (
        <div
          data-testid="storage-unavailable-banner"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-semibold"
        >
          {t('Lưu trữ gián đoạn: Khóa gửi để đảm bảo an toàn biên nhận idempotency.')}
        </div>
      )}

      {/* CLOSED assignment resolution banners */}
      {isClosedResolving && (
        <div
          data-testid="zs-closed-stream-resolving-banner"
          className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2"
        >
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('Đang tra cứu lịch sử gán nguồn để xác thực mã phân bổ đã đóng (CLOSED)...')}</span>
        </div>
      )}

      {expectedCurrentState === 'CLOSED' && resolvedClosedAssignmentId != null && (
        <div
          data-testid="zs-closed-stream-resolved-banner"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1"
        >
          <div className="font-bold">
            {t('Khôi phục liên kết đã đóng (CLOSED): Đã xác thực mã phân bổ lịch sử #{0}, phiên bản v{1}.', [
              resolvedClosedAssignmentId,
              newExpectedVersionStr,
            ])}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
            {t('Hệ thống đã đối chiếu chính xác lịch sử gán nguồn để đảm bảo lệnh gán lại an toàn và không gây xung đột.')}
          </div>
        </div>
      )}

      {isClosedAssignmentIdMissing && (
        <div
          data-testid="zs-closed-stream-missing-id-banner"
          className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
        >
          <div className="font-bold mb-1">
            {t('Nguồn đã đóng (CLOSED) chưa có mã lần gán đối chiếu')}
          </div>
          <div>
            {closedResolutionError ||
              t(
                'Không tìm thấy mã lần gán đã đóng (closed assignment ID) trong lịch sử khu vực để đối chiếu an toàn. Yêu cầu quản trị viên kiểm tra lại (HANDOFF_REVIEW_REQUIRED).'
              )}
          </div>
        </div>
      )}

      {/* Adapter-specific Config Form */}
      {!isIotLab ? (
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              {t('Thông số giao thức MQTT')}
            </span>
            <span className="text-[11px] font-mono text-[#64748B]">durian/+/sensors</span>
          </div>

          <div className="space-y-1">
            <label htmlFor="mqtt-topic-input" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Topic MQTT')} <span className="text-red-500">*</span>
            </label>
            <input
              id="mqtt-topic-input"
              data-testid="assign-mqtt-topic-input"
              type="text"
              readOnly
              value={mqttTopic}
              className="w-full h-11 min-h-[44px] px-3 font-mono text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-[#F1F5F9] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] cursor-not-allowed"
            />
            {clientErrors.mqttTopic && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{clientErrors.mqttTopic}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="mqtt-expected-unit-input" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Đơn vị đo kỳ vọng')}
            </label>
            <input
              id="mqtt-expected-unit-input"
              data-testid="assign-expected-unit-input"
              type="text"
              value={expectedUnit}
              disabled={submitting}
              maxLength={64}
              onChange={e => setExpectedUnit(e.target.value)}
              className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
            />
            {clientErrors.expectedUnit && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{clientErrors.expectedUnit}</p>
            )}
          </div>

          <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            {t('Kênh MQTT truyền thống nhận dữ liệu thụ động qua broker theo mã khu vực; không sử dụng tác vụ polling định kỳ.')}
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              {t('Cấu hình ánh xạ IoTLab Gateway')}
            </span>
            {effectiveMappingState && (
              <span
                data-testid="iotlab-mapping-state-badge"
                className={`h-[26px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center ${
                  getMappingStateMeta(effectiveMappingState, t).badgeClass
                }`}
              >
                {getMappingStateMeta(effectiveMappingState, t).label}
              </span>
            )}
          </div>

          {iotLabMappingsLoading && (
            <div className="text-xs text-[#64748B] animate-pulse">{t('Đang tải danh sách mapping IoTLab...')}</div>
          )}
          {iotLabMappingsError && (
            <div
              data-testid="iotlab-mappings-error-banner"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 leading-relaxed"
            >
              {getZoneSourceErrorMessage(iotLabMappingsError, t)}
            </div>
          )}

          {effectiveMappingState === 'BLOCKED' && (
            <div
              data-testid="iotlab-blocked-warning"
              className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
            >
              {t('Cảnh báo: Mapping đang ở trạng thái BLOCKED (Tạm ngắt). Thao tác gán/cấu hình nguồn KHÔNG tự động xóa trạng thái BLOCKED.')}
            </div>
          )}

          {/* Valid mapping card */}
          {iotLabEvaluation &&
            (iotLabEvaluation.kind === 'EXISTING_BOUND' || iotLabEvaluation.kind === 'ELIGIBLE_INITIAL') && (
              <div className="p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8]">{t('Mã Mapping IoTLab')}</span>
                    <div
                      data-testid="iotlab-mapping-id-display"
                      className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm mt-0.5"
                    >
                      #{iotLabEvaluation.mappingId}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8]">{t('Phiên bản Mapping (Version)')}</span>
                    <div
                      data-testid="iotlab-mapping-version-display"
                      className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm mt-0.5"
                    >
                      v{iotLabEvaluation.version}
                    </div>
                  </div>
                </div>
                {iotLabEvaluation.kind === 'ELIGIBLE_INITIAL' && (
                  <div
                    data-testid="iotlab-eligible-initial-badge"
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium"
                  >
                    {t('Mapping chưa liên kết (Sẵn sàng gán)')} · #{iotLabEvaluation.mappingId}
                  </div>
                )}
              </div>
            )}

          {/* Blocked or notice card */}
          {iotLabEvaluation?.isBlocked && (
            <div
              data-testid={
                iotLabEvaluation.kind === 'UNIT_MISMATCH'
                  ? 'iotlab-unit-mismatch-notice'
                  : 'iotlab-unbound-blocked-notice'
              }
              className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
            >
              <div className="font-bold mb-1">
                {iotLabEvaluation.kind === 'UNIT_MISMATCH'
                  ? t('Không khớp đơn vị đo giữa mapping và cảm biến')
                  : t('Chưa thể gán nguồn IoTLab với mapping hiện tại')}
              </div>
              <div>{iotLabEvaluation.blockReason}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="iotlab-ext-sensor-id" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {t('Mã cảm biến ngoài (External Sensor ID)')}
              </label>
              <input
                id="iotlab-ext-sensor-id"
                data-testid="iotlab-external-sensor-id-input"
                type="text"
                value={expectedExternalSensorId}
                disabled={submitting}
                maxLength={255}
                onChange={e => setExpectedExternalSensorId(e.target.value)}
                placeholder="7001"
                className="w-full h-11 min-h-[44px] px-3 font-mono text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="iotlab-expected-unit" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {t('Đơn vị đo kỳ vọng')}
              </label>
              <input
                id="iotlab-expected-unit"
                data-testid="assign-expected-unit-input"
                type="text"
                value={expectedUnit}
                disabled={submitting}
                maxLength={64}
                onChange={e => setExpectedUnit(e.target.value)}
                className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>
          </div>

          {!isAlreadyBound && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] cursor-pointer text-xs">
              <input
                type="checkbox"
                data-testid="iotlab-bind-if-unbound-checkbox"
                checked={bindIfUnbound}
                disabled={submitting}
                onChange={e => setBindIfUnbound(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#1F5CA9]"
              />
              <div>
                <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block">
                  {t('Gắn cấu hình thu thập này nếu chưa liên kết (bindIfUnbound)')}
                </span>
                <span className="text-[#475569] dark:text-[#94A3B8]">
                  {t('Chỉ áp dụng cho mapping IoTLab đang tắt và chưa gắn vào luồng nào.')}
                </span>
              </div>
            </label>
          )}

          {isBindingConsentMissing && (
            <div
              data-testid="iotlab-binding-consent-required-notice"
              className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
            >
              {t('Cần đồng ý gắn cấu hình thu thập (bindIfUnbound) để tiếp tục gán nguồn IoTLab ban đầu.')}
            </div>
          )}

          <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] cursor-pointer text-xs">
            <input
              type="checkbox"
              data-testid="iotlab-reactivate-polling-checkbox"
              checked={reactivatePolling}
              disabled={submitting}
              onChange={e => setReactivatePolling(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#1F5CA9]"
            />
            <div>
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block">
                {t('Bật lại thu thập định kỳ (Mặc định: TẮT)')}
              </span>
              <span className="text-[#475569] dark:text-[#94A3B8]">
                {t('Giữ nguyên trạng thái ngắt cho đến khi quản trị viên chủ động bật lại; không tự ý xóa cảnh báo BLOCKED.')}
              </span>
            </div>
          </label>
        </div>
      )}

      {/* Reason */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="assign-reason-textarea" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Lý do thao tác')} <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] text-[#64748B]">{reason.length}/1000</span>
        </div>
        <textarea
          id="assign-reason-textarea"
          data-testid="assign-reason-input"
          ref={reasonRef}
          value={reason}
          rows={3}
          maxLength={1000}
          disabled={submitting}
          onChange={e => setReason(e.target.value)}
          placeholder={t('Nhập lý do thực hiện thay đổi nguồn dữ liệu này (tối thiểu 1 ký tự, tối đa 1000 ký tự)...')}
          className="w-full p-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#1F5CA9]"
        />
        {clientErrors.reason && (
          <p className="text-xs text-red-600 dark:text-red-400">{clientErrors.reason}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-11 min-h-[44px] px-4 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
        >
          {t('Hủy bỏ')}
        </button>
        <button
          type="submit"
          data-testid="btn-assign-submit"
          disabled={submitting || storageUnavailable || isSubmissionBlocked}
          className="h-11 min-h-[44px] px-5 rounded-lg bg-[#1F5CA9] text-white text-xs font-semibold hover:bg-[#184986] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting && (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>
            {mode === 'REPLACE'
              ? t('Xác nhận thay thế nguồn')
              : mode === 'CONFIGURE'
                ? t('Lưu cấu hình')
                : t('Xác nhận gán nguồn')}
          </span>
        </button>
      </div>
    </form>
  );
}
