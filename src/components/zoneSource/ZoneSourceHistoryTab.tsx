import { useState } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import type {
  DecimalId,
  ParsedZoneSourceError,
  ZoneSourceAssignmentItem,
  ZoneSourceRecordingEvidence,
  ZoneSourceStatusSensorItem,
} from '../../types/zoneSource';
import { formatGmt7DateTime } from '../../utils/zoneSourceValidation';
import { formatSensorUnit, getSensorTypeDisplayName } from './zoneSourceLabels';

interface ZoneSourceHistoryTabProps {
  isOwner: boolean;
  sensors: ZoneSourceStatusSensorItem[];
  selectedSensorId: DecimalId | null;
  onSelectSensor: (sensorId: DecimalId) => void;
  loading: boolean;
  loadingMore: boolean;
  items: ZoneSourceAssignmentItem[];
  nextAfterAssignmentId: DecimalId | null;
  error: ParsedZoneSourceError | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onOpenEvidence: (
    assignment: ZoneSourceAssignmentItem,
    evidence: ZoneSourceRecordingEvidence
  ) => void;
}

export default function ZoneSourceHistoryTab({
  isOwner,
  sensors,
  selectedSensorId,
  onSelectSensor,
  loading,
  loadingMore,
  items,
  nextAfterAssignmentId,
  error,
  onRetry,
  onLoadMore,
  onOpenEvidence,
}: ZoneSourceHistoryTabProps) {
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  if (sensors.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs text-[#475569] dark:text-[#94A3B8] text-center">
        {t('Chưa có cảm biến trong khu vực để xem lịch sử gán nguồn.')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sensor selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="history-sensor-select"
          className="block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]"
        >
          {t('Xem lịch sử gán nguồn của cảm biến')}
        </label>
        <select
          id="history-sensor-select"
          data-testid="history-sensor-select"
          value={selectedSensorId ?? ''}
          onChange={e => e.target.value && onSelectSensor(e.target.value)}
          className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        >
          {sensors.map(s => (
            <option key={s.sensorId} value={s.sensorId}>
              {getSensorTypeDisplayName(s.sensorType, t)} (#{s.sensorId} · {formatSensorUnit(s.unit, t)})
            </option>
          ))}
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div data-testid="history-skeleton" className="space-y-3 animate-pulse">
          <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
          <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
        </div>
      ) : error && items.length === 0 ? (
        <div
          data-testid="history-error"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 space-y-2.5"
        >
          <div className="text-xs font-semibold">{getZoneSourceErrorMessage(error, t)}</div>
          <button
            type="button"
            data-testid="btn-retry-history"
            onClick={onRetry}
            className="h-11 min-h-[44px] px-4 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 text-xs font-semibold transition-colors"
          >
            {t('Thử lại')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div
          data-testid="history-empty"
          className="p-5 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-center text-xs text-[#475569] dark:text-[#94A3B8]"
        >
          {t('Cảm biến này chưa có bản ghi lịch sử gán nguồn nào.')}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isOpen = item.assignmentState === 'OPEN';
            const reasonExpanded = Boolean(expandedReasons[item.assignmentId]);
            const hasLongReason = (item.reason?.length ?? 0) > 150;
            const closeAudit = item.closeAudit;

            return (
              <article
                key={item.assignmentId}
                data-testid={`history-card-${item.assignmentId}`}
                className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {item.publicProviderLabel} · {item.publicStreamLabel}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      #{item.assignmentId} · v{item.version}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`h-[26px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 ${
                        isOpen
                          ? 'bg-blue-50 text-[#1F5CA9] border border-blue-200 dark:bg-blue-950/70 dark:text-[#60A5FA] dark:border-blue-800'
                          : 'bg-slate-100 text-[#475569] border border-[#E2E8F0] dark:bg-slate-800 dark:text-[#CBD5E1] dark:border-[#334155]'
                      }`}
                    >
                      {isOpen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1F5CA9] dark:bg-[#60A5FA]" />
                      )}
                      {isOpen ? t('Đang gán') : t('Đã ngừng gán')}
                    </span>
                    {item.registryState === 'RETIRED' && (
                      <span className="h-[26px] px-2.5 rounded-[6px] bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300 inline-flex items-center">
                        {t('Đã ngừng sử dụng')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamps & Actor */}
                <div className="text-xs text-[#475569] dark:text-[#CBD5E1] space-y-1">
                  <div>
                    {t('Bắt đầu')}:{' '}
                    <span className="font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {formatGmt7DateTime(item.effectiveFrom)}
                    </span>
                  </div>
                  <div>
                    {t('Kết thúc')}:{' '}
                    <span className="font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {item.effectiveTo
                        ? formatGmt7DateTime(item.effectiveTo)
                        : t('Hiện tại (OPEN)')}
                    </span>
                  </div>
                  {!isOwner && item.createdBy && (
                    <div>
                      {t('Người thực hiện')}:{' '}
                      <span className="font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        #{item.createdBy}
                      </span>
                    </div>
                  )}
                </div>

                {/* ADMIN Reasons (assign reason + closeAudit) */}
                {!isOwner && item.reason && (
                  <div className="bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-3 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      {t('Lý do gán nguồn')}
                    </span>
                    <p
                      className={`text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed break-words ${
                        !reasonExpanded && hasLongReason ? 'line-clamp-3' : ''
                      }`}
                    >
                      {item.reason}
                    </p>
                    {hasLongReason && (
                      <button
                        type="button"
                        data-testid={`btn-expand-reason-${item.assignmentId}`}
                        onClick={() =>
                          setExpandedReasons(prev => ({
                            ...prev,
                            [item.assignmentId]: !reasonExpanded,
                          }))
                        }
                        className="min-h-[44px] px-2 text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:underline"
                      >
                        {reasonExpanded ? t('Thu gọn lý do') : t('Xem toàn bộ lý do')}
                      </button>
                    )}
                  </div>
                )}

                {!isOwner && !isOpen && closeAudit && (
                  <div
                    data-testid={`close-audit-${item.assignmentId}`}
                    className="bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-3 text-xs space-y-1"
                  >
                    {closeAudit.status === 'RECORDED' ? (
                      <>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                          {t('Lý do ngừng gán')}
                        </div>
                        <p className="text-[#0F172A] dark:text-[#F8FAFC] break-words">
                          {closeAudit.reason || '—'}
                        </p>
                        <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                          {closeAudit.actorId ? `#${closeAudit.actorId}` : ''}
                          {closeAudit.appliedAt
                            ? ` · ${formatGmt7DateTime(closeAudit.appliedAt)}`
                            : ''}
                        </div>
                      </>
                    ) : closeAudit.status === 'UNAVAILABLE' ? (
                      <p className="italic text-[#475569] dark:text-[#94A3B8]">
                        {t('Chưa có thông tin thao tác ngừng gán')}
                      </p>
                    ) : null}
                  </div>
                )}

                <button
                  type="button"
                  data-testid={`btn-history-evidence-${item.assignmentId}`}
                  onClick={() => onOpenEvidence(item, item.recordingEvidence)}
                  className="w-full h-11 min-h-[44px] px-4 rounded-lg bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">fact_check</span>
                  <span>{t('Xem chi tiết ghi nhận lần gán #{0}', [item.assignmentId])}</span>
                </button>
              </article>
            );
          })}

          {nextAfterAssignmentId && (
            <button
              type="button"
              data-testid="btn-load-more-history"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full h-11 min-h-[44px] rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loadingMore ? t('Đang tải thêm...') : t('Tải thêm')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
