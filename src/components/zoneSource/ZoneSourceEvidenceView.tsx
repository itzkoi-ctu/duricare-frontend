import { getLanguage, t } from '../../i18n';
import type {
  ZoneSourceAssignmentItem,
  ZoneSourceRecordingEvidence,
} from '../../types/zoneSource';
import { formatGmt7DateTime, formatRelativeAge } from '../../utils/zoneSourceValidation';
import { getEvidenceStateMeta } from './zoneSourceLabels';

interface ZoneSourceEvidenceViewProps {
  assignment: ZoneSourceAssignmentItem;
  evidence: ZoneSourceRecordingEvidence;
  isOwner: boolean;
  onBack: () => void;
}

export default function ZoneSourceEvidenceView({
  assignment,
  evidence,
  isOwner,
  onBack,
}: ZoneSourceEvidenceViewProps) {
  const lang = getLanguage();
  const stateMeta = getEvidenceStateMeta(evidence.state, t);

  const basisLabel =
    evidence.receiptTimestampBasis === 'SERVER_METRIC_PROCESSING'
      ? t('Thời điểm máy chủ nhận metric MQTT')
      : t('Thời điểm máy chủ xử lý ingest');

  return (
    <div data-testid="zs-evidence-view" className="space-y-5">
      {/* Status Banner */}
      <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {assignment.publicProviderLabel} · {assignment.publicStreamLabel}
          </span>
          <span
            data-testid="evidence-state-chip"
            className={`h-[26px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 ${stateMeta.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stateMeta.dotClass}`} />
            <span>{stateMeta.label}</span>
          </span>
        </div>

        <div className="text-xs text-[#475569] dark:text-[#CBD5E1] flex flex-wrap gap-x-4 gap-y-1">
          <span>
            {t('Tuổi bản ghi')}:{' '}
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
              {formatRelativeAge(evidence.ageSeconds, lang)}
            </strong>
          </span>
          <span>
            {t('Ngưỡng')}: <strong className="font-mono">{evidence.thresholdSeconds}s</strong>
          </span>
          <span>
            {t('Thuật toán')}: <strong className="font-mono">{evidence.algorithmVersion}</strong>
          </span>
        </div>

        {evidence.state === 'TIME_INCONSISTENT' && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            {t(
              'Cảnh báo: Mốc thời gian tiếp nhận lớn hơn thời điểm quan sát của máy chủ (độ lệch đồng hồ).'
            )}
          </div>
        )}
      </div>

      {/* Four Distinct Timestamps Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
          {t('Bốn mốc thời gian độc lập')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              {t('Thời điểm đo (recordAt)')}
            </div>
            <div className="text-xs font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {formatGmt7DateTime(evidence.recordAt)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              {t('Thời điểm máy chủ nhận (receivedAt)')}
            </div>
            <div className="text-xs font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {formatGmt7DateTime(evidence.receivedAt)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              {t('Thời điểm lưu nhận (acceptedAt)')}
            </div>
            <div className="text-xs font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {formatGmt7DateTime(evidence.acceptedAt)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              {t('Mốc đo mới nhất (latestMeasurementAt)')}
            </div>
            <div className="text-xs font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {formatGmt7DateTime(evidence.latestMeasurementAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Timestamp Basis */}
      <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-xs space-y-1">
        <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Cơ sở tính mốc nhận')}: {basisLabel}
        </div>
        <div className="text-[#475569] dark:text-[#94A3B8] font-mono text-[11px]">
          {evidence.receiptTimestampBasis}
        </div>
      </div>

      {/* Disclosure for technical IDs */}
      <details
        data-testid="evidence-technical-disclosure"
        className="rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] overflow-hidden group"
      >
        <summary className="px-4 py-3 cursor-pointer min-h-[44px] flex items-center justify-between text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
          <span>{t('Chi tiết định danh kỹ thuật (ID)')}</span>
          <span className="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">
            expand_more
          </span>
        </summary>
        <div className="px-4 pb-3 pt-1 border-t border-[#E2E8F0] dark:border-[#334155] font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC] space-y-1 select-all break-all">
          <div>assignmentId: {evidence.assignmentId}</div>
          <div>streamId: {evidence.streamId}</div>
          <div>sensorId: {assignment.sensorId}</div>
          <div>readingId: {evidence.readingId ?? 'null'}</div>
          {!isOwner && assignment.mqttTopic && <div>mqttTopic: {assignment.mqttTopic}</div>}
          {!isOwner && assignment.expectedExternalSensorId && (
            <div>expectedExternalSensorId: {assignment.expectedExternalSensorId}</div>
          )}
        </div>
      </details>

      {/* Honest Disclaimer */}
      <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs text-[#475569] dark:text-[#94A3B8] flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
        <span>
          {t(
            'Bằng chứng ghi nhận chỉ phản ánh các bản tin số đo đã lưu nhận hợp lệ trong hệ thống; không khẳng định thiết bị vật lý hiện đang trực tuyến.'
          )}
        </span>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          data-testid="btn-evidence-back"
          onClick={onBack}
          className="h-11 min-h-[44px] px-5 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors"
        >
          {t('Quay lại')}
        </button>
      </div>
    </div>
  );
}
