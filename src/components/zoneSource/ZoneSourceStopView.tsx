import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import type {
  DisableOperationRequest,
  ParsedZoneSourceError,
  TargetAssignmentSnapshot,
  ZoneSourceAssignmentItem,
  ZoneSourceStatusSensorItem,
} from '../../types/zoneSource';
import {
  formatTextValidationMessage,
  validateStrictText,
} from '../../utils/zoneSourceValidation';
import { formatSensorUnit, getSensorTypeDisplayName } from './zoneSourceLabels';

interface ZoneSourceStopViewProps {
  zoneCode: string;
  targetSensor: ZoneSourceStatusSensorItem;
  assignment: ZoneSourceAssignmentItem;
  submitting: boolean;
  storageUnavailable: boolean;
  serverError: ParsedZoneSourceError | null;
  operationId: string;
  onDirtyChange: (dirty: boolean) => void;
  onSubmit: (command: DisableOperationRequest, snapshot: TargetAssignmentSnapshot) => void;
  onCancel: () => void;
}

export default function ZoneSourceStopView({
  zoneCode,
  targetSensor,
  assignment,
  submitting,
  storageUnavailable,
  serverError,
  operationId,
  onDirtyChange,
  onSubmit,
  onCancel,
}: ZoneSourceStopViewProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const isMqtt =
    assignment.acquisitionSupport === 'LEGACY_MQTT_COMPATIBLE' ||
    Boolean(assignment.mqttTopic);

  useEffect(() => {
    onDirtyChange(Boolean(reason));
  }, [onDirtyChange, reason]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storageUnavailable || submitting) return;

    const code = validateStrictText(reason, {
      nullable: false,
      maxLength: 1000,
      allowBlank: false,
      allowControls: false,
    });
    if (code !== 'OK') {
      setReasonError(formatTextValidationMessage(t('Lý do ngừng gán nguồn'), code, 1000, t));
      reasonRef.current?.focus();
      return;
    }

    const command: DisableOperationRequest = {
      contractVersion: 'ZS-1',
      kind: 'DISABLE',
      operationId,
      zoneCode,
      sensorId: targetSensor.sensorId,
      oldStreamId: assignment.streamId,
      oldAssignmentId: assignment.assignmentId,
      oldExpectedVersion: assignment.latestAssignmentVersion ?? assignment.version,
      reason,
    };

    const snapshot: TargetAssignmentSnapshot = {
      streamId: assignment.streamId,
      streamLabel: assignment.publicStreamLabel,
      providerLabel: assignment.publicProviderLabel,
      sensorId: targetSensor.sensorId,
      sensorLabel: `${targetSensor.sensorType} #${targetSensor.sensorId} (${formatSensorUnit(targetSensor.unit, t)})`,
      assignmentId: assignment.assignmentId,
      version: assignment.latestAssignmentVersion ?? assignment.version,
      assignmentState: assignment.assignmentState,
      adapterKind: isMqtt ? 'MQTT' : 'IOTLAB_HTTP',
      mqttTopic: assignment.mqttTopic ?? null,
      mappingId: assignment.mapping?.id ?? null,
      mappingVersion: assignment.mapping?.version ?? null,
    };

    onSubmit(command, snapshot);
  };

  return (
    <form data-testid="zs-stop-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Target Summary Card */}
      <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#475569] dark:text-[#94A3B8]">{t('Hồ sơ gán được chỉ định')}:</span>
          <span className="h-[26px] px-2.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono font-semibold inline-flex items-center">
            #{assignment.assignmentId} · v{assignment.version}
          </span>
        </div>
        <div>
          {t('Nguồn')}:{' '}
          <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
            {assignment.publicProviderLabel} (#{assignment.streamId})
          </strong>
        </div>
        <div>
          {t('Cảm biến')}:{' '}
          <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
            {getSensorTypeDisplayName(targetSensor.sensorType, t)} (#{targetSensor.sensorId} · {formatSensorUnit(targetSensor.unit, t)})
          </strong>
        </div>
        {assignment.mqttTopic && (
          <div className="text-[#475569] dark:text-[#94A3B8] break-all">
            {t('Topic hiện thời')}:{' '}
            <code className="font-mono text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#E2E8F0] dark:border-[#334155]">
              {assignment.mqttTopic}
            </code>
          </div>
        )}
        {assignment.registryState === 'RETIRED' && (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            {t('Nguồn này đã ngừng sử dụng (RETIRED); bạn vẫn có thể đóng bản ghi gán mở để dọn sạch trạng thái.')}
          </div>
        )}
      </div>

      {/* Mandatory Transport-Specific Stop Warning */}
      <div
        data-testid="stop-warning-banner"
        className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-xl p-4 text-xs text-amber-950 dark:text-amber-200 space-y-2 shadow-sm"
      >
        <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200 text-sm">
          <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400">
            warning
          </span>
          <span>
            {isMqtt
              ? t('Cảnh báo ngắt liên kết thu nhận MQTT:')
              : t('Cảnh báo ngừng thu thập IoTLab Gateway:')}
          </span>
        </div>
        {isMqtt ? (
          <>
            <p className="leading-relaxed">
              <strong>{t('Ngừng gán không ngăn dữ liệu gửi theo mã khu vực.')}</strong>{' '}
              {t(
                'Dữ liệu từ trạm phát vẫn có thể được đẩy lên broker và xử lý qua kênh dự phòng nhưng sẽ không gắn vào bản ghi gán nguồn này.'
              )}
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              {t(
                'Hệ thống DuriCare không trực tiếp tắt thiết bị vật lý hay máy chủ MQTT Broker của nhà cung cấp.'
              )}
            </p>
          </>
        ) : (
          <>
            <p className="leading-relaxed">
              {t(
                'Ngừng gán sẽ đóng bản ghi gán nguồn và dừng lập lịch thu thập mới từ IoTLab; lần đọc đang chạy dở (nếu có) vẫn có thể hoàn tất.'
              )}
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              {t(
                'Lịch sử đọc và mốc đồng bộ (checkpoint) được giữ nguyên; thao tác không tắt trạm phần cứng IoTLab.'
              )}
            </p>
          </>
        )}
      </div>

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
          data-testid="stop-server-error"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
        >
          {getZoneSourceErrorMessage(serverError, t)}
        </div>
      )}

      {/* Reason */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="stop-reason" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Lý do ngừng gán nguồn')} <span className="text-red-600">*</span>
          </label>
          <span className="text-[11px] text-[#64748B] font-mono">{reason.length}/1000</span>
        </div>
        <textarea
          ref={reasonRef}
          id="stop-reason"
          data-testid="stop-reason-input"
          rows={3}
          value={reason}
          disabled={submitting}
          maxLength={1000}
          onChange={e => {
            setReason(e.target.value);
            setReasonError(null);
          }}
          placeholder={t('Ghi rõ lý do ngừng tiếp nhận dữ liệu từ nguồn này...')}
          className="w-full p-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {reasonError && (
          <p data-testid="stop-reason-error" className="text-xs text-red-600 dark:text-red-400">
            {reasonError}
          </p>
        )}
      </div>

      <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
        {t('* Lịch sử các gói tin telemetry đã ghi nhận trước đây vẫn được bảo toàn.')}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-stop-cancel"
          disabled={submitting}
          onClick={onCancel}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {t('Hủy')}
        </button>
        <button
          type="submit"
          data-testid="btn-stop-confirm"
          disabled={submitting || storageUnavailable}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('Đang ngừng gán...') : t('Xác nhận ngừng gán')}
        </button>
      </div>
    </form>
  );
}
