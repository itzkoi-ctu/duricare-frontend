import { t } from '../../i18n';
import { getLanguage } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import type { SensorMetadata } from '../../types/sensor';
import type {
  DecimalId,
  ParsedZoneSourceError,
  ZoneSourceAssignmentItem,
  ZoneSourceRecordingEvidence,
  ZoneSourceStatusResponse,
  ZoneSourceStatusSensorItem,
} from '../../types/zoneSource';
import { formatGmt7DateTime, formatRelativeAge } from '../../utils/zoneSourceValidation';
import {
  formatSensorUnit,
  getAcquisitionSupportMeta,
  getEvidenceStateMeta,
  getMappingStateMeta,
  getSensorTypeDisplayName,
} from './zoneSourceLabels';

interface ZoneSourceCurrentTabProps {
  isOwner: boolean;
  loading: boolean;
  loadingMore: boolean;
  statusData: ZoneSourceStatusResponse | null;
  statusError: ParsedZoneSourceError | null;
  fallbackSensors: SensorMetadata[] | null;
  expandedSensorIds: Record<string, boolean>;
  onToggleSensor: (sensorId: DecimalId) => void;
  onRetryStatus: () => void;
  onLoadMoreSensors: () => void;
  onOpenEvidence: (
    assignment: ZoneSourceAssignmentItem,
    evidence: ZoneSourceRecordingEvidence
  ) => void;
  onOpenAssignForSensor: (sensor: ZoneSourceStatusSensorItem) => void;
  onConfigureAssignment: (
    sensor: ZoneSourceStatusSensorItem,
    assignment: ZoneSourceAssignmentItem
  ) => void;
  onReplaceAssignment: (
    sensor: ZoneSourceStatusSensorItem,
    assignment: ZoneSourceAssignmentItem
  ) => void;
  onStopAssignment: (
    sensor: ZoneSourceStatusSensorItem,
    assignment: ZoneSourceAssignmentItem
  ) => void;
}

function getSensorIcon(sensorType: string): string {
  switch (sensorType) {
    case 'SOIL_MOISTURE':
      return 'water_drop';
    case 'TEMPERATURE':
      return 'device_thermostat';
    case 'HUMIDITY':
      return 'humidity_percentage';
    case 'BATTERY_VOLTAGE':
      return 'battery_charging_full';
    default:
      return 'sensors';
  }
}

export default function ZoneSourceCurrentTab({
  isOwner,
  loading,
  loadingMore,
  statusData,
  statusError,
  fallbackSensors,
  expandedSensorIds,
  onToggleSensor,
  onRetryStatus,
  onLoadMoreSensors,
  onOpenEvidence,
  onOpenAssignForSensor,
  onConfigureAssignment,
  onReplaceAssignment,
  onStopAssignment,
}: ZoneSourceCurrentTabProps) {
  const lang = getLanguage();

  // Feature disabled or permission error blocking whole read
  if (statusError && (statusError.isDisabledFeature || statusError.isForbidden || statusError.isNotFound || statusError.isUnauthorized)) {
    const icon = statusError.isForbidden
      ? 'do_not_disturb'
      : statusError.isNotFound
      ? 'location_off'
      : statusError.isUnauthorized
      ? 'login'
      : 'lock';
    return (
      <div
        data-testid="zone-source-blocking-error"
        className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 space-y-2"
      >
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[22px] shrink-0">{icon}</span>
          <div className="space-y-1">
            <div className="text-sm font-bold">{getZoneSourceErrorMessage(statusError, t)}</div>
            <div className="text-xs opacity-80 font-mono">{statusError.code}</div>
          </div>
        </div>
        {statusError.status >= 500 && (
          <button
            type="button"
            data-testid="btn-retry-status-block"
            onClick={onRetryStatus}
            className="h-11 min-h-[44px] px-4 rounded-lg bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-xs font-semibold hover:bg-amber-300 transition-colors"
          >
            {t('Thử lại')}
          </button>
        )}
      </div>
    );
  }

  if (loading && !statusData) {
    return (
      <div data-testid="zone-source-skeleton" className="space-y-3 animate-pulse">
        <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
      </div>
    );
  }

  // Case: Sensor catalog exists (fallbackSensors or prior statusData) while source-status 503/network failed
  if (statusError && !statusData && fallbackSensors && fallbackSensors.length > 0) {
    return (
      <div className="space-y-4">
        {fallbackSensors.map(sensor => (
          <div
            key={sensor.id}
            data-testid={`sensor-fallback-${sensor.id}`}
            className="border border-[#E2E8F0] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {getSensorTypeDisplayName(sensor.type, t)} ({sensor.type})
                </h3>
                <span className="h-[26px] px-2 rounded-[6px] bg-slate-100 dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] font-mono text-xs inline-flex items-center">
                  #{sensor.id}
                </span>
                <span className="h-[26px] px-2 rounded-[6px] bg-slate-100 dark:bg-slate-800 text-xs inline-flex items-center">
                  {t('Đơn vị: {0}', [formatSensorUnit(sensor.unit, t)])}
                </span>
              </div>
            </div>
            <div
              data-testid={`source-block-error-${sensor.id}`}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 text-xs text-red-800 dark:text-red-200">
                <span className="material-symbols-outlined text-[18px]">cloud_off</span>
                <span>
                  {getZoneSourceErrorMessage(statusError, t)} ({t('Danh mục cảm biến không đổi.')})
                </span>
              </div>
              <button
                type="button"
                data-testid="btn-retry-source-block"
                onClick={onRetryStatus}
                className="h-9 px-3 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-100 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                {t('Thử lại nguồn')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (statusError && !statusData) {
    return (
      <div
        data-testid="zone-source-status-error"
        className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="material-symbols-outlined text-[20px]">cloud_off</span>
          <span>{getZoneSourceErrorMessage(statusError, t)}</span>
        </div>
        <button
          type="button"
          data-testid="btn-retry-status"
          onClick={onRetryStatus}
          className="h-11 min-h-[44px] px-4 rounded-lg bg-red-100 dark:bg-red-900/60 hover:bg-red-200 text-xs font-semibold transition-colors"
        >
          {t('Thử lại')}
        </button>
      </div>
    );
  }

  const sensors = statusData?.items ?? [];

  if (sensors.length === 0) {
    return (
      <div
        data-testid="zone-source-no-sensors"
        className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-center space-y-2"
      >
        <span className="material-symbols-outlined text-3xl text-[#64748B] dark:text-[#94A3B8]">
          sensors_off
        </span>
        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Khu vực này chưa có cảm biến nào được cấu hình.')}
        </p>
        <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
          {t('Cần khởi tạo cảm biến kỹ thuật trong khu vực trước khi gán nguồn dữ liệu.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inline non-blocking error banner when refresh failed over existing data */}
      {statusError && (
        <div
          data-testid="zone-source-refresh-warning"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 text-xs text-red-800 dark:text-red-200"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">cloud_off</span>
            <span>{getZoneSourceErrorMessage(statusError, t)}</span>
          </div>
          <button
            type="button"
            data-testid="btn-retry-source-refresh"
            onClick={onRetryStatus}
            className="h-9 px-3 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-100 font-semibold whitespace-nowrap transition-colors"
          >
            {t('Thử lại nguồn')}
          </button>
        </div>
      )}

      {/* Informational Top Banner */}
      <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs text-[#475569] dark:text-[#CBD5E1] flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-[#1F5CA9] dark:text-[#60A5FA] shrink-0 mt-0.5">
          info
        </span>
        <p className="leading-relaxed">
          {isOwner
            ? t(
                'Thông tin nguồn dữ liệu hiển thị ở chế độ chỉ xem trong phạm vi nông trại của bạn. Trạng thái ghi nhận phản ánh các bản ghi đã nạp.'
              )
            : t(
                'Các cảm biến đại diện cho chỉ số quan trắc của khu vực. Một cảm biến có thể nhận dữ liệu đồng thời từ nhiều nguồn đã đăng ký.'
              )}
        </p>
      </div>

      {/* Sensor Accordions */}
      {sensors.map(sensor => {
        const isExpanded = Boolean(expandedSensorIds[sensor.sensorId]);
        const activeCount = sensor.currentAssignments.length;
        const firstTopic = sensor.currentAssignments.find(a => a.mqttTopic)?.mqttTopic;
        const countBadgeClass =
          activeCount > 0
            ? 'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
            : 'bg-slate-100 text-[#475569] border border-[#E2E8F0] dark:bg-slate-800 dark:text-[#94A3B8] dark:border-[#334155]';

        return (
          <section
            key={sensor.sensorId}
            data-testid={`sensor-accordion-${sensor.sensorId}`}
            className={`rounded-xl bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden transition-all ${
              isExpanded
                ? 'border-2 border-[#1F5CA9]/45 dark:border-[#60A5FA]/50'
                : 'border border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            <button
              type="button"
              data-testid={`sensor-accordion-toggle-${sensor.sensorId}`}
              aria-expanded={isExpanded}
              onClick={() => onToggleSensor(sensor.sensorId)}
              className={`w-full p-4 flex items-center justify-between gap-3 text-left transition-colors ${
                isExpanded
                  ? 'bg-[#F8FAFC] dark:bg-[#162032] border-b border-[#E2E8F0] dark:border-[#334155]'
                  : 'hover:bg-[#F8FAFC] dark:hover:bg-[#162032]/70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    activeCount > 0
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-[#1F5CA9] dark:text-[#60A5FA] border-blue-200 dark:border-blue-800/80'
                      : 'bg-slate-100 dark:bg-[#162032] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {getSensorIcon(sensor.sensorType)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-snug">
                      {getSensorTypeDisplayName(sensor.sensorType, t)} ({sensor.sensorType})
                    </h3>
                    <span className="h-[26px] px-2 rounded-[6px] bg-[#F1F5F9] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] font-mono text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] inline-flex items-center">
                      #{sensor.sensorId}
                    </span>
                    <span className="h-[26px] px-2 rounded-[6px] bg-[#F1F5F9] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-xs font-medium text-[#475569] dark:text-[#CBD5E1] inline-flex items-center">
                      {t('Đơn vị: {0}', [formatSensorUnit(sensor.unit, t)])}
                    </span>
                  </div>
                  <div className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 break-words">
                    <span>
                      {t('Số nguồn đang gán')}:{' '}
                      <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
                        {activeCount === 0
                          ? t('Chưa có nguồn')
                          : t('{0} nguồn', [activeCount])}
                      </strong>
                    </span>
                    {!isOwner && firstTopic && (
                      <span className="ml-1.5 font-mono text-[11px] opacity-80">
                        ({firstTopic})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span
                  className={`h-[26px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center whitespace-nowrap ${countBadgeClass}`}
                >
                  {t('{0} nguồn', [activeCount])}
                </span>
                <span
                  className={`material-symbols-outlined text-[20px] text-[#475569] dark:text-[#94A3B8] transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-4 bg-[#F8FAFC]/60 dark:bg-[#0F172A]/40">
                {activeCount === 0 ? (
                  <div
                    data-testid={`sensor-empty-${sensor.sensorId}`}
                    className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#64748B] dark:text-[#94A3B8] shrink-0">
                      link_off
                    </span>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {t('Chưa cấu hình nguồn')}
                      </div>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                        {t('Cảm biến này chưa được gán nguồn tiếp nhận dữ liệu nào.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  sensor.currentAssignments.map(assignment => {
                    // Pair evidence strictly by assignmentId/streamId, never by index
                    const matchedEvidence =
                      sensor.recordingEvidence.find(
                        e =>
                          e.assignmentId === assignment.assignmentId &&
                          e.streamId === assignment.streamId
                      ) ?? assignment.recordingEvidence;
                    const supportMeta = getAcquisitionSupportMeta(
                      assignment.acquisitionSupport,
                      t
                    );
                    const evMeta = getEvidenceStateMeta(matchedEvidence.state, t);
                    const mappingMeta = assignment.mapping
                      ? getMappingStateMeta(assignment.mapping.state, t)
                      : null;

                    return (
                      <article
                        key={assignment.assignmentId}
                        data-testid={`assignment-card-${assignment.assignmentId}`}
                        className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-500 transition-colors space-y-3"
                      >
                        {/* Top Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] break-words">
                                {assignment.publicProviderLabel}
                              </span>
                              <span className="h-[26px] px-2 rounded-[6px] bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] font-mono text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] inline-flex items-center">
                                #{assignment.streamId}
                              </span>
                              <span
                                className={`h-[26px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center ${supportMeta.badgeClass}`}
                              >
                                {supportMeta.label}
                              </span>
                              <span className="h-[26px] px-2.5 rounded-[6px] bg-slate-100 dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-xs font-medium text-[#475569] dark:text-[#CBD5E1] inline-flex items-center">
                                {t('Đang gán')}
                              </span>
                              {assignment.registryState === 'RETIRED' && (
                                <span className="h-[26px] px-2.5 rounded-[6px] bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300 inline-flex items-center">
                                  {t('Đã ngừng sử dụng (RETIRED)')}
                                </span>
                              )}
                            </div>

                            {/* Channel / Stream label */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {!isOwner && assignment.mqttTopic ? (
                                <code className="text-xs font-mono text-[#1F5CA9] dark:text-[#60A5FA] bg-[#F8FAFC] dark:bg-[#162032] px-2.5 py-1 rounded-md border border-[#E2E8F0] dark:border-[#334155] inline-block break-all">
                                  {assignment.mqttTopic}
                                </code>
                              ) : !isOwner && assignment.mapping ? (
                                <span className="text-xs font-mono text-[#475569] dark:text-[#CBD5E1] bg-[#F8FAFC] dark:bg-[#162032] px-2.5 py-1 rounded-md border border-[#E2E8F0] dark:border-[#334155] inline-block">
                                  Mapping #{assignment.mapping.id} · v{assignment.mapping.version}
                                </span>
                              ) : (
                                <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
                                  {assignment.publicStreamLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Evidence Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs">
                          <div>
                            <span className="text-[#475569] dark:text-[#94A3B8] block mb-1">
                              {t('Tình trạng tiếp nhận')}:
                            </span>
                            <div className="flex items-center gap-1.5 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${evMeta.dotClass}`}
                              />
                              <span>
                                {evMeta.label}
                                {matchedEvidence.state !== 'NEVER_RECORDED' &&
                                matchedEvidence.ageSeconds !== null
                                  ? ` · ${formatRelativeAge(matchedEvidence.ageSeconds, lang)}`
                                  : ''}
                              </span>
                            </div>
                          </div>

                          <div>
                            {!isOwner && assignment.mapping && mappingMeta ? (
                              <>
                                <span className="text-[#475569] dark:text-[#94A3B8] block mb-1">
                                  {t('Định kỳ thu thập')}:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`h-[26px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center ${mappingMeta.badgeClass}`}
                                  >
                                    {mappingMeta.label}
                                  </span>
                                  {!assignment.mapping.globallyEnabled && (
                                    <span className="text-[11px] text-amber-700 dark:text-amber-300">
                                      {t('Cổng IoTLab đang tắt')}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-[#475569] dark:text-[#94A3B8] block mb-1">
                                  {t('Mốc xử lý gần nhất')}:
                                </span>
                                <span className="font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                  {formatGmt7DateTime(matchedEvidence.receivedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-xs">
                          <button
                            type="button"
                            data-testid={`btn-evidence-${assignment.assignmentId}`}
                            onClick={() => onOpenEvidence(assignment, matchedEvidence)}
                            className="min-h-[44px] px-2 text-[#1F5CA9] dark:text-[#60A5FA] hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>{t('Chi tiết ghi nhận')}</span>
                            <span className="material-symbols-outlined text-[16px]">
                              chevron_right
                            </span>
                          </button>

                          {!isOwner && (
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              <button
                                type="button"
                                data-testid={`btn-configure-${assignment.assignmentId}`}
                                onClick={() => onConfigureAssignment(sensor, assignment)}
                                className="min-h-[44px] px-2.5 rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                              >
                                {t('Cấu hình')}
                              </button>
                              <button
                                type="button"
                                data-testid={`btn-replace-${assignment.assignmentId}`}
                                onClick={() => onReplaceAssignment(sensor, assignment)}
                                className="min-h-[44px] px-2.5 rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                              >
                                {t('Thay nguồn')}
                              </button>
                              <button
                                type="button"
                                data-testid={`btn-stop-${assignment.assignmentId}`}
                                onClick={() => onStopAssignment(sensor, assignment)}
                                className="min-h-[44px] px-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold transition-colors"
                              >
                                {t('Ngừng gán')}
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}

                {!isOwner && (
                  <button
                    type="button"
                    data-testid={`btn-assign-sensor-${sensor.sensorId}`}
                    onClick={() => onOpenAssignForSensor(sensor)}
                    className="w-full h-11 min-h-[44px] rounded-lg border border-dashed border-[#1F5CA9]/50 dark:border-[#60A5FA]/60 text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>
                      {t('Gán nguồn dữ liệu cho {0}', [
                        getSensorTypeDisplayName(sensor.sensorType, t),
                      ])}
                    </span>
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {statusData?.page.nextAfterSensorId && (
        <button
          type="button"
          data-testid="btn-load-more-sensors"
          onClick={onLoadMoreSensors}
          disabled={loadingMore}
          className="w-full h-11 min-h-[44px] rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loadingMore ? t('Đang tải thêm...') : t('Tải thêm cảm biến')}
        </button>
      )}

      {/* Honest Telemetry Disclaimer */}
      <div className="p-3 bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#475569] dark:text-[#94A3B8] flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-[#64748B] shrink-0">
          warning
        </span>
        <span className="leading-relaxed">
          {t(
            'Trạng thái ghi nhận không xác nhận thiết bị đang trực tuyến. Hệ thống chỉ đối chiếu các bản ghi telemetry đã được nạp hợp lệ.'
          )}
        </span>
      </div>
    </div>
  );
}
