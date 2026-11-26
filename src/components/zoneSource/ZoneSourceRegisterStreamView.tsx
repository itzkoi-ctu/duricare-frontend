import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import { ALL_SENSOR_TYPES, type SensorType } from '../../types/sensor';
import type { ProviderDiscovery } from '../../types/farmVisual';
import type {
  DecimalId,
  ParsedZoneSourceError,
  RegisterStreamOperationRequest,
  RetainedNodeMetadata,
  ZoneSourceFieldError,
  ZoneSourceNodeItem,
} from '../../types/zoneSource';
import {
  formatTextValidationMessage,
  validateStrictText,
  validateThreeLevelMqttTopic,
} from '../../utils/zoneSourceValidation';
import { getSensorTypeDisplayName } from './zoneSourceLabels';

interface ZoneSourceRegisterStreamViewProps {
  zoneCode: string;
  providers: ProviderDiscovery[];
  nodes: ZoneSourceNodeItem[];
  nodesLoading: boolean;
  nodesError: ParsedZoneSourceError | null;
  prefillNode?: RetainedNodeMetadata | null;
  submitting: boolean;
  storageUnavailable: boolean;
  serverError: ParsedZoneSourceError | null;
  operationId: string;
  onLoadNodes: (providerId: DecimalId) => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenRegisterNode: () => void;
  onSubmit: (command: RegisterStreamOperationRequest) => void;
  onCancel: () => void;
}

const LEGACY_MQTT_SUPPORTED_TYPES = new Set<SensorType>([
  'TEMPERATURE',
  'HUMIDITY',
  'SOIL_MOISTURE',
]);

export default function ZoneSourceRegisterStreamView({
  zoneCode,
  providers,
  nodes,
  nodesLoading,
  nodesError,
  prefillNode,
  submitting,
  storageUnavailable,
  serverError,
  operationId,
  onLoadNodes,
  onDirtyChange,
  onOpenRegisterNode,
  onSubmit,
  onCancel,
}: ZoneSourceRegisterStreamViewProps) {
  const activeProviders = providers.filter(p => !p.retiredAt);
  const initialProviderId =
    prefillNode?.providerId ??
    (activeProviders[0] ? String(activeProviders[0].id) : '');

  const [bindMode, setBindMode] = useState<'NODE' | 'MQTT_TOPIC'>(
    prefillNode ? 'NODE' : activeProviders.find(p => String(p.id) === initialProviderId)?.adapterKind === 'MQTT' ? 'MQTT_TOPIC' : 'NODE'
  );
  const [providerId, setProviderId] = useState<string>(initialProviderId);
  const [nodeId, setNodeId] = useState<string>(prefillNode?.nodeId ?? '');
  const [mqttTopic, setMqttTopic] = useState<string>(`durian/${zoneCode}/sensors`);
  const [externalId, setExternalId] = useState<string>('');
  const [sensorType, setSensorType] = useState<SensorType>('SOIL_MOISTURE');
  const [reason, setReason] = useState<string>('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const externalIdRef = useRef<HTMLInputElement>(null);
  const mqttTopicRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (providerId && bindMode === 'NODE') {
      onLoadNodes(providerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, bindMode]);

  useEffect(() => {
    if (prefillNode) {
      setBindMode('NODE');
      setProviderId(prefillNode.providerId);
      setNodeId(prefillNode.nodeId);
    }
  }, [prefillNode]);

  useEffect(() => {
    onDirtyChange(Boolean(externalId || reason));
  }, [externalId, onDirtyChange, reason]);

  const mapFieldErrors = (fes: ZoneSourceFieldError[]): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const fe of fes) {
      out[fe.field] = formatTextValidationMessage(fe.field, fe.code, 255, t);
    }
    return out;
  };
  const mergedErrors = {
    ...(serverError?.fieldErrors ? mapFieldErrors(serverError.fieldErrors) : {}),
    ...clientErrors,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storageUnavailable || submitting) return;

    const nextErrors: Record<string, string> = {};
    if (!providerId) {
      nextErrors.providerId = t('Vui lòng chọn nhà cung cấp.');
    }
    if (bindMode === 'NODE') {
      if (!nodeId) {
        nextErrors.nodeId = t('Vui lòng chọn trạm hoặc thiết bị.');
      }
    } else {
      const topicErr = validateThreeLevelMqttTopic(mqttTopic);
      if (topicErr) {
        nextErrors.mqttTopic = formatTextValidationMessage('MQTT Topic', topicErr, 1024, t);
      }
    }
    const extCheck = validateStrictText(externalId, {
      nullable: false,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (extCheck !== 'OK') {
      nextErrors.externalId = formatTextValidationMessage(t('Mã luồng ngoài'), extCheck, 255, t);
    }
    const reasonCheck = validateStrictText(reason, {
      nullable: false,
      maxLength: 1000,
      allowBlank: false,
      allowControls: false,
    });
    if (reasonCheck !== 'OK') {
      nextErrors.reason = formatTextValidationMessage(t('Lý do đăng ký'), reasonCheck, 1000, t);
    }

    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.mqttTopic) mqttTopicRef.current?.focus();
      else if (nextErrors.externalId) externalIdRef.current?.focus();
      else if (nextErrors.reason) reasonRef.current?.focus();
      return;
    }

    const command: RegisterStreamOperationRequest = {
      contractVersion: 'ZS-1',
      kind: 'REGISTER_STREAM',
      operationId,
      providerId,
      nodeId: bindMode === 'NODE' ? nodeId : null,
      mqttTopic: bindMode === 'MQTT_TOPIC' ? mqttTopic : null,
      externalId,
      sensorType,
      reason,
    };
    onSubmit(command);
  };

  return (
    <form data-testid="zs-register-stream-form" onSubmit={handleSubmit} className="space-y-4">
      {prefillNode && (
        <div
          data-testid="stream-prefill-node-banner"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1"
        >
          <div className="font-bold">
            {t('Đã tạo trạm/thiết bị #{0} ({1})', [prefillNode.nodeId, prefillNode.externalId])}
          </div>
          <p>{t('Tiếp tục bước 2 để đăng ký luồng dữ liệu cho trạm vừa tạo.')}</p>
        </div>
      )}

      {storageUnavailable && (
        <div
          data-testid="storage-unavailable-banner"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-semibold"
        >
          {t('Lưu trữ gián đoạn: Khóa gửi để đảm bảo an toàn biên nhận idempotency.')}
        </div>
      )}

      {serverError && (
        <div
          data-testid="register-stream-server-error"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
        >
          {getZoneSourceErrorMessage(serverError, t)}
        </div>
      )}

      {/* Provider */}
      <div className="space-y-1.5">
        <label htmlFor="stream-provider-select" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Nhà cung cấp')} <span className="text-red-600">*</span>
        </label>
        <select
          id="stream-provider-select"
          data-testid="stream-provider-select"
          value={providerId}
          disabled={submitting}
          onChange={e => {
            setProviderId(e.target.value);
            setNodeId('');
            setClientErrors(prev => ({ ...prev, providerId: '' }));
          }}
          className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        >
          {activeProviders.map(p => (
            <option key={p.id} value={String(p.id)}>
              {p.displayName || p.code} ({p.adapterKind})
            </option>
          ))}
        </select>
      </div>

      {/* Mode Switch: Existing Node vs MQTT Topic (Mutually exclusive per ZoneSourceCodec) */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Phương thức liên kết luồng')} <span className="text-red-600">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            data-testid="stream-mode-node"
            disabled={submitting}
            onClick={() => setBindMode('NODE')}
            className={`h-11 min-h-[44px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
              bindMode === 'NODE'
                ? 'border-[#1F5CA9] bg-blue-50/70 text-[#1F5CA9] dark:border-[#60A5FA] dark:bg-blue-950/50 dark:text-[#60A5FA]'
                : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#CBD5E1]'
            }`}
          >
            {t('Gắn với trạm / thiết bị')}
          </button>
          <button
            type="button"
            data-testid="stream-mode-mqtt"
            disabled={submitting}
            onClick={() => setBindMode('MQTT_TOPIC')}
            className={`h-11 min-h-[44px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
              bindMode === 'MQTT_TOPIC'
                ? 'border-[#1F5CA9] bg-blue-50/70 text-[#1F5CA9] dark:border-[#60A5FA] dark:bg-blue-950/50 dark:text-[#60A5FA]'
                : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#CBD5E1]'
            }`}
          >
            {t('Topic MQTT (3 tầng)')}
          </button>
        </div>
      </div>

      {bindMode === 'NODE' ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="stream-node-select" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Chọn trạm / thiết bị')} <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={onOpenRegisterNode}
              className="text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:underline"
            >
              + {t('Đăng ký trạm mới')}
            </button>
          </div>
          {nodesLoading ? (
            <div className="text-xs text-[#64748B] animate-pulse py-2">{t('Đang tải danh sách trạm...')}</div>
          ) : nodesError ? (
            <div className="text-xs text-red-600 dark:text-red-400">
              {getZoneSourceErrorMessage(nodesError, t)}
            </div>
          ) : (
            <select
              id="stream-node-select"
              data-testid="stream-node-select"
              value={nodeId}
              disabled={submitting}
              onChange={e => {
                setNodeId(e.target.value);
                setClientErrors(prev => ({ ...prev, nodeId: '' }));
              }}
              className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="">{t('-- Chọn trạm / thiết bị --')}</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.kind} #{n.externalId} {n.displayName ? `— ${n.displayName}` : ''}
                </option>
              ))}
            </select>
          )}
          {mergedErrors.nodeId && (
            <p data-testid="stream-node-error" className="text-xs text-red-600 dark:text-red-400">
              {mergedErrors.nodeId}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="stream-mqtt-topic" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Topic MQTT (đúng 3 tầng)')} <span className="text-red-600">*</span>
          </label>
          <input
            ref={mqttTopicRef}
            id="stream-mqtt-topic"
            data-testid="stream-mqtt-topic-input"
            type="text"
            value={mqttTopic}
            disabled={submitting}
            maxLength={1024}
            onChange={e => {
              setMqttTopic(e.target.value);
              setClientErrors(prev => ({ ...prev, mqttTopic: '' }));
            }}
            placeholder={`durian/${zoneCode}/sensors`}
            className="w-full h-11 min-h-[44px] px-3 font-mono text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
          />
          {mergedErrors.mqttTopic && (
            <p data-testid="stream-mqtt-topic-error" className="text-xs text-red-600 dark:text-red-400">
              {mergedErrors.mqttTopic}
            </p>
          )}
          {!LEGACY_MQTT_SUPPORTED_TYPES.has(sensorType) && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t('Lưu ý: Kênh MQTT truyền thống chỉ hỗ trợ Nhiệt độ, Độ ẩm không khí, Độ ẩm đất.')}
            </p>
          )}
        </div>
      )}

      {/* Stream External ID */}
      <div className="space-y-1.5">
        <label htmlFor="stream-external-id" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Mã định danh luồng ngoài (External ID)')} <span className="text-red-600">*</span>
        </label>
        <input
          ref={externalIdRef}
          id="stream-external-id"
          data-testid="stream-external-id-input"
          type="text"
          value={externalId}
          disabled={submitting}
          maxLength={255}
          onChange={e => {
            setExternalId(e.target.value);
            setClientErrors(prev => ({ ...prev, externalId: '' }));
          }}
          placeholder="9011"
          className="w-full h-11 min-h-[44px] px-3 font-mono text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {mergedErrors.externalId && (
          <p data-testid="stream-external-id-error" className="text-xs text-red-600 dark:text-red-400">
            {mergedErrors.externalId}
          </p>
        )}
      </div>

      {/* SensorType (real backend enum values including HUMIDITY) */}
      <div className="space-y-1.5">
        <label htmlFor="stream-sensor-type" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Loại chỉ số cảm biến')} <span className="text-red-600">*</span>
        </label>
        <select
          id="stream-sensor-type"
          data-testid="stream-sensor-type-select"
          value={sensorType}
          disabled={submitting}
          onChange={e => setSensorType(e.target.value as SensorType)}
          className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        >
          {ALL_SENSOR_TYPES.map(st => (
            <option key={st} value={st}>
              {getSensorTypeDisplayName(st, t)} ({st})
            </option>
          ))}
        </select>
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="stream-reason" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Lý do đăng ký luồng')} <span className="text-red-600">*</span>
          </label>
          <span className="text-[11px] text-[#64748B] font-mono">{reason.length}/1000</span>
        </div>
        <textarea
          ref={reasonRef}
          id="stream-reason"
          data-testid="stream-reason-input"
          rows={3}
          value={reason}
          disabled={submitting}
          maxLength={1000}
          onChange={e => {
            setReason(e.target.value);
            setClientErrors(prev => ({ ...prev, reason: '' }));
          }}
          placeholder={t('Ghi rõ lý do tạo luồng dữ liệu mới...')}
          className="w-full p-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {mergedErrors.reason && (
          <p data-testid="stream-reason-error" className="text-xs text-red-600 dark:text-red-400">
            {mergedErrors.reason}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-register-stream-cancel"
          disabled={submitting}
          onClick={onCancel}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {prefillNode ? t('Tạm dừng') : t('Hủy')}
        </button>
        <button
          type="submit"
          data-testid="btn-register-stream-submit"
          disabled={submitting || storageUnavailable}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('Đang đăng ký...') : t('Đăng ký luồng dữ liệu')}
        </button>
      </div>
    </form>
  );
}
