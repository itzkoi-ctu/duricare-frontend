import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import type { RoutingContract, StreamDiscovery } from '../../types/farmVisual';
import {
  isValidDecimalVersion,
  isValidPositiveDecimalId,
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
import { getMappingStateMeta, getSensorTypeDisplayName } from './zoneSourceLabels';

interface ZoneSourceAssignOrReplaceViewProps {
  mode: 'ASSIGN' | 'CONFIGURE' | 'REPLACE';
  zoneCode: string;
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

  const matchedAdminMapping = useMemo(() => {
    if (!isIotLab) return null;
    if (currentAssignment?.mapping) {
      return (
        iotLabMappings.find(m => String(m.id) === currentAssignment.mapping!.id) ?? null
      );
    }
    const stationExt = streamDetail.node?.externalId;
    const streamExt = streamDetail.externalId;
    return (
      iotLabMappings.find(
        m =>
          String(m.stationId) === String(stationExt) &&
          String(m.streamId) === String(streamExt)
      ) ?? null
    );
  }, [currentAssignment?.mapping, iotLabMappings, isIotLab, streamDetail.externalId, streamDetail.node?.externalId]);

  const [mqttTopic] = useState<string>(derivedMqttTopic);
  const [expectedUnit, setExpectedUnit] = useState<string>(
    currentAssignment?.expectedUnit ??
      matchedAdminMapping?.expectedUnit ??
      targetSensor.unit
  );
  const selectedMappingId = currentAssignment?.mapping?.id ?? '';
  const expectedMappingVersion = currentAssignment?.mapping?.version
    ? String(currentAssignment.mapping.version)
    : '';
  const [expectedExternalSensorId, setExpectedExternalSensorId] = useState<string>(() => {
    if (currentAssignment?.expectedExternalSensorId) {
      return currentAssignment.expectedExternalSensorId;
    }
    if (matchedAdminMapping?.expectedSensorId != null) {
      return String(matchedAdminMapping.expectedSensorId);
    }
    return '';
  });
  const [bindIfUnbound, setBindIfUnbound] = useState<boolean>(
    !currentAssignment?.mapping && streamDetail.acquisitionSupport === 'REGISTRY_ONLY'
  );
  const [reactivatePolling, setReactivatePolling] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!expectedExternalSensorId && matchedAdminMapping?.expectedSensorId != null) {
      setExpectedExternalSensorId(String(matchedAdminMapping.expectedSensorId));
    }
    if (matchedAdminMapping?.expectedUnit && expectedUnit === targetSensor.unit) {
      setExpectedUnit(matchedAdminMapping.expectedUnit);
    }
  }, [
    expectedExternalSensorId,
    expectedUnit,
    matchedAdminMapping,
    targetSensor.unit,
  ]);

  useEffect(() => {
    onDirtyChange(Boolean(reason));
  }, [onDirtyChange, reason]);

  const effectiveMappingState =
    currentAssignment?.mapping?.state ?? matchedAdminMapping?.state ?? null;

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
    // Stream has historical version > 0 and currentAssignment is null -> CLOSED in backend
    expectedCurrentState = 'CLOSED';
    const historicalClosed = targetSensor.currentAssignments.find(
      a => String(a.streamId) === String(streamDetail.id)
    );
    expectedCurrentAssignmentId = historicalClosed ? historicalClosed.assignmentId : null;
  }

  const isClosedAssignmentIdMissing =
    expectedCurrentState === 'CLOSED' && expectedCurrentAssignmentId === null;
  const isUnboundIotLabBlocked = isIotLab && !currentAssignment?.mapping;
  const isSubmissionBlocked = isClosedAssignmentIdMissing || isUnboundIotLabBlocked;

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

    if (!isIotLab) {
      const topicErr = validateThreeLevelMqttTopic(mqttTopic);
      if (topicErr) {
        nextErrors.mqttTopic = formatTextValidationMessage('Topic MQTT', topicErr, 1024, t);
      }
    } else {
      if (!selectedMappingId || !isValidPositiveDecimalId(selectedMappingId)) {
        nextErrors.mappingId = t('Chưa có thông tin mapping IoTLab hợp lệ.');
      }
      if (!expectedMappingVersion || !isValidDecimalVersion(expectedMappingVersion)) {
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

    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.reason) reasonRef.current?.focus();
      return;
    }

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
          expectedExternalSensorId: expectedExternalSensorId === '' ? null : expectedExternalSensorId,
          mqttTopic: null,
          mappingId: selectedMappingId,
          expectedMappingVersion,
          bindIfUnbound,
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
        expectedExternalSensorId: expectedExternalSensorId === '' ? null : expectedExternalSensorId,
        mqttTopic: null,
        mappingId: selectedMappingId,
        expectedMappingVersion,
        bindIfUnbound,
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

  return (
    <form data-testid="zs-assign-replace-form" onSubmit={handleSubmit} className="space-y-4">
      {/* REPLACE Before vs After Comparison Card */}
      {mode === 'REPLACE' && replacingAssignment && (
        <div
          data-testid="replace-comparison-card"
          className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] space-y-3"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            {t('Đối chiếu nguồn cũ và nguồn thay thế')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-1">
              <div className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                {t('Nguồn sẽ ngừng gán')}
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
            {getSensorTypeDisplayName(targetSensor.sensorType, t)} (#{targetSensor.sensorId} · {targetSensor.unit})
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

      {isClosedAssignmentIdMissing && (
        <div
          data-testid="zs-closed-stream-missing-id-banner"
          className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
        >
          <div className="font-bold mb-1">
            {t('Nguồn đã đóng (CLOSED) chưa có mã lần gán đối chiếu')}
          </div>
          <div>
            {t(
              'Nguồn này đã từng có lịch sử gán (phiên bản {0}) nhưng hiện đã đóng (CLOSED). API đọc máy chủ hiện tại chưa cung cấp mã lần gán đã đóng (closed assignment ID) để đối chiếu an toàn. Cần cập nhật hợp đồng đọc máy chủ trước khi thực hiện thao tác này.',
              [newExpectedVersionStr]
            )}
          </div>
        </div>
      )}

      {serverError && (
        <div
          data-testid="assign-server-error"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
        >
          {getZoneSourceErrorMessage(serverError, t)}
        </div>
      )}

      {/* Transport-specific section */}
      {!isIotLab ? (
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            {t('Cấu hình kênh nhận MQTT (3 tầng)')}
          </div>

          <div className="space-y-1">
            <span className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Topic MQTT áp dụng')}
            </span>
            <div
              data-testid="assign-mqtt-topic-readonly"
              className="px-3 py-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] font-mono text-xs sm:text-sm text-[#1F5CA9] dark:text-[#60A5FA] break-all"
            >
              {mqttTopic}
            </div>
            {clientErrors.mqttTopic && (
              <p className="text-xs text-red-600 dark:text-red-400">{clientErrors.mqttTopic}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="mqtt-expected-unit" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Đơn vị đo kỳ vọng')}
            </label>
            <input
              id="mqtt-expected-unit"
              data-testid="assign-expected-unit-input"
              type="text"
              value={expectedUnit}
              disabled={submitting}
              maxLength={64}
              onChange={e => setExpectedUnit(e.target.value)}
              className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
            />
            {clientErrors.expectedUnit && (
              <p className="text-xs text-red-600 dark:text-red-400">{clientErrors.expectedUnit}</p>
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
            <div className="text-xs text-amber-700 dark:text-amber-300">
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

          {currentAssignment?.mapping ? (
            <div className="p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#64748B] dark:text-[#94A3B8]">{t('Mã Mapping IoTLab')}</span>
                <div data-testid="iotlab-mapping-id-display" className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm mt-0.5">
                  #{currentAssignment.mapping.id}
                </div>
              </div>
              <div>
                <span className="text-[#64748B] dark:text-[#94A3B8]">{t('Phiên bản Mapping (Version)')}</span>
                <div data-testid="iotlab-mapping-version-display" className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm mt-0.5">
                  v{currentAssignment.mapping.version}
                </div>
              </div>
            </div>
          ) : (
            <div
              data-testid="iotlab-unbound-blocked-notice"
              className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
            >
              <div className="font-bold mb-1">
                {t('Chưa hỗ trợ liên kết tự động luồng IoTLab chưa gắn mapping')}
              </div>
              <div>
                {t('API máy chủ hiện tại chưa cung cấp trường phiên bản (@Version) cho danh sách mapping để đảm bảo đối chiếu bất biến an toàn. Vui lòng cấu hình mapping trước trên hệ thống hoặc chờ cập nhật hợp đồng đọc máy chủ.')}
              </div>
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

          {!currentAssignment?.mapping && (
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
          <label htmlFor="assign-reason" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Lý do thao tác')} <span className="text-red-600">*</span>
          </label>
          <span className="text-[11px] text-[#64748B] font-mono">{reason.length}/1000</span>
        </div>
        <textarea
          ref={reasonRef}
          id="assign-reason"
          data-testid="assign-reason-input"
          rows={3}
          value={reason}
          disabled={submitting}
          maxLength={1000}
          onChange={e => {
            setReason(e.target.value);
            setClientErrors(prev => ({ ...prev, reason: '' }));
          }}
          placeholder={t('Ghi rõ lý do gán, cấu hình hoặc thay thế nguồn...')}
          className="w-full p-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {clientErrors.reason && (
          <p data-testid="assign-reason-error" className="text-xs text-red-600 dark:text-red-400">
            {clientErrors.reason}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-assign-cancel"
          disabled={submitting}
          onClick={onCancel}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {t('Quay lại')}
        </button>
        <button
          type="submit"
          data-testid="btn-assign-submit"
          disabled={submitting || storageUnavailable || isSubmissionBlocked}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? t('Đang thực hiện...')
            : mode === 'REPLACE'
            ? t('Xác nhận thay nguồn')
            : mode === 'CONFIGURE'
            ? t('Lưu cấu hình nguồn')
            : isIotLab
            ? t('Xác nhận gán IoTLab')
            : t('Xác nhận gán nguồn MQTT')}
        </button>
      </div>
    </form>
  );
}
