import { useMemo } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import { ALL_SENSOR_TYPES } from '../../types/sensor';
import type { ProviderDiscovery, StreamDiscovery } from '../../types/farmVisual';
import type {
  ParsedZoneSourceError,
  RetainedNodeMetadata,
  ZoneSourceAssignmentItem,
  ZoneSourceStatusSensorItem,
} from '../../types/zoneSource';
import {
  formatSensorUnit,
  getAcquisitionSupportMeta,
  getSensorTypeDisplayName,
} from './zoneSourceLabels';

interface ZoneSourcePickerViewProps {
  targetSensor: ZoneSourceStatusSensorItem;
  mode: 'ASSIGN' | 'REPLACE';
  replacingAssignment?: ZoneSourceAssignmentItem;
  providers: ProviderDiscovery[];
  streams: StreamDiscovery[];
  nextAfterId: number | null;
  loading: boolean;
  loadingMore: boolean;
  error: ParsedZoneSourceError | null;
  selectedStreamId: number | null;
  selectedStreamDetail: StreamDiscovery | null;
  detailLoading: boolean;
  detailError: ParsedZoneSourceError | null;
  filterProviderId: string;
  filterAdapterKind: string;
  filterSensorType: string;
  filterIncludeRetired: boolean;
  filterSearch: string;
  retainedNode: RetainedNodeMetadata | null;
  onChangeProviderFilter: (val: string) => void;
  onChangeAdapterFilter: (val: string) => void;
  onChangeSensorTypeFilter: (val: string) => void;
  onChangeIncludeRetired: (val: boolean) => void;
  onChangeSearch: (val: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onSelectStream: (streamId: number) => void;
  onOpenRegisterNode: () => void;
  onOpenRegisterStream: (prefillNode?: RetainedNodeMetadata | null) => void;
  onBack: () => void;
  onProceed: () => void;
}

function getEligibility(
  stream: StreamDiscovery,
  targetSensor: ZoneSourceStatusSensorItem,
  mode: 'ASSIGN' | 'REPLACE',
  replacingAssignment?: ZoneSourceAssignmentItem
): { eligible: boolean; reason: string | null } {
  if (stream.retiredAt || stream.provider.retiredAt || stream.node?.retiredAt) {
    return { eligible: false, reason: t('Nguồn hoặc trạm đã ngừng sử dụng (RETIRED).') };
  }
  if (stream.acquisitionSupport === 'REGISTRY_ONLY') {
    const isEligibleInitialIotLab =
      stream.provider.adapterKind === 'IOTLAB_HTTP' && stream.nodeId !== null;
    if (!isEligibleInitialIotLab) {
      return {
        eligible: false,
        reason: t('Nguồn chỉ lưu thông tin (REGISTRY_ONLY); chưa hỗ trợ tiếp nhận trực tiếp cho khu vực.'),
      };
    }
  }
  if (stream.sensorType !== targetSensor.sensorType) {
    return {
      eligible: false,
      reason: t('Khác loại cảm biến ({0} ≠ {1}).', [stream.sensorType, targetSensor.sensorType]),
    };
  }
  if (mode === 'REPLACE' && replacingAssignment && String(stream.id) === replacingAssignment.streamId) {
    return {
      eligible: false,
      reason: t('Đây là nguồn đang được gán hiện tại; vui lòng chọn nguồn thay thế khác.'),
    };
  }
  if (
    stream.currentAssignment &&
    stream.currentAssignment.effectiveTo === null &&
    String(stream.currentAssignment.sensorId) !== targetSensor.sensorId
  ) {
    return {
      eligible: false,
      reason: t('Nguồn đang được gán mở cho cảm biến khác (#{0}).', [
        stream.currentAssignment.sensorId,
      ]),
    };
  }
  if (
    mode === 'REPLACE' &&
    stream.currentAssignment &&
    stream.currentAssignment.effectiveTo === null
  ) {
    return {
      eligible: false,
      reason: t('Nguồn mới được chọn cho thay thế phải ở trạng thái chưa gán mở.'),
    };
  }
  return { eligible: true, reason: null };
}

export default function ZoneSourcePickerView({
  targetSensor,
  mode,
  replacingAssignment,
  providers,
  streams,
  nextAfterId,
  loading,
  loadingMore,
  error,
  selectedStreamId,
  selectedStreamDetail,
  detailLoading,
  detailError,
  filterProviderId,
  filterAdapterKind,
  filterSensorType,
  filterIncludeRetired,
  filterSearch,
  retainedNode,
  onChangeProviderFilter,
  onChangeAdapterFilter,
  onChangeSensorTypeFilter,
  onChangeIncludeRetired,
  onChangeSearch,
  onRetry,
  onLoadMore,
  onSelectStream,
  onOpenRegisterNode,
  onOpenRegisterStream,
  onBack,
  onProceed,
}: ZoneSourcePickerViewProps) {
  const filteredStreams = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return streams.filter(s => {
      if (filterAdapterKind !== 'ALL' && s.provider.adapterKind !== filterAdapterKind) {
        return false;
      }
      if (!q) return true;
      return (
        String(s.id).includes(q) ||
        s.externalId.toLowerCase().includes(q) ||
        s.externalNamespace.toLowerCase().includes(q) ||
        (s.provider.displayName || s.provider.code).toLowerCase().includes(q) ||
        (s.node?.externalId || '').toLowerCase().includes(q)
      );
    });
  }, [filterAdapterKind, filterSearch, streams]);

  const activeDetail =
    selectedStreamDetail && selectedStreamDetail.id === selectedStreamId
      ? selectedStreamDetail
      : null;
  const activeEligibility = activeDetail
    ? getEligibility(activeDetail, targetSensor, mode, replacingAssignment)
    : { eligible: false, reason: null };

  const canProceed =
    selectedStreamId !== null &&
    !detailLoading &&
    activeDetail !== null &&
    activeEligibility.eligible;

  return (
    <div data-testid="zs-picker-view" className="space-y-4">
      {/* Info Context */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-[#1F5CA9] dark:text-[#60A5FA] shrink-0 mt-0.5">
          info
        </span>
        <div className="leading-relaxed">
          {mode === 'REPLACE' && replacingAssignment ? (
            <span>
              {t('Đang chọn nguồn thay thế cho lần gán #{0} ({1}) trên cảm biến {2} (#{3} · {4}).', [
                replacingAssignment.assignmentId,
                replacingAssignment.publicProviderLabel,
                getSensorTypeDisplayName(targetSensor.sensorType, t),
                targetSensor.sensorId,
                formatSensorUnit(targetSensor.unit, t),
              ])}
            </span>
          ) : (
            <span>
              {t('Một cảm biến có thể nhận dữ liệu từ nhiều nguồn đã gán. Đang chọn nguồn cho {0} (#{1} · {2}).', [
                getSensorTypeDisplayName(targetSensor.sensorType, t),
                targetSensor.sensorId,
                formatSensorUnit(targetSensor.unit, t),
              ])}
            </span>
          )}
        </div>
      </div>

      {/* Retained node notice */}
      {retainedNode && (
        <div
          data-testid="picker-retained-node-banner"
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200"
        >
          <span>
            {t('Có trạm/thiết bị vừa đăng ký #{0} ({1}) chưa hoàn tất đăng ký luồng.', [
              retainedNode.nodeId,
              retainedNode.externalId,
            ])}
          </span>
          <button
            type="button"
            data-testid="btn-resume-retained-node"
            onClick={() => onOpenRegisterStream(retainedNode)}
            className="h-9 px-3 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-semibold whitespace-nowrap hover:bg-amber-300 transition-colors"
          >
            {t('Đăng ký luồng cho trạm này')}
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <span className="material-symbols-outlined text-[18px] text-[#64748B] absolute left-3 top-3">
            search
          </span>
          <input
            type="text"
            data-testid="picker-search-input"
            value={filterSearch}
            onChange={e => onChangeSearch(e.target.value)}
            placeholder={t('Tìm theo topic, mã luồng hoặc tên nhà cung cấp...')}
            className="w-full h-11 min-h-[44px] pl-9 pr-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            data-testid="picker-filter-provider"
            aria-label={t('Nhà cung cấp')}
            value={filterProviderId}
            onChange={e => onChangeProviderFilter(e.target.value)}
            className="h-11 min-h-[44px] px-2.5 text-[16px] md:text-xs font-medium rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
          >
            <option value="ALL">{t('Tất cả nhà cung cấp')}</option>
            {providers.map(p => (
              <option key={p.id} value={String(p.id)}>
                {p.displayName || p.code} ({p.adapterKind})
              </option>
            ))}
          </select>

          <select
            data-testid="picker-filter-adapter"
            aria-label={t('Loại adapter')}
            value={filterAdapterKind}
            onChange={e => onChangeAdapterFilter(e.target.value)}
            className="h-11 min-h-[44px] px-2.5 text-[16px] md:text-xs font-medium rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
          >
            <option value="ALL">{t('Tất cả adapter')}</option>
            <option value="MQTT">MQTT</option>
            <option value="IOTLAB_HTTP">IOTLAB_HTTP</option>
          </select>

          <select
            data-testid="picker-filter-sensor-type"
            aria-label={t('Loại cảm biến')}
            value={filterSensorType}
            onChange={e => onChangeSensorTypeFilter(e.target.value)}
            className="h-11 min-h-[44px] px-2.5 text-[16px] md:text-xs font-medium rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
          >
            <option value="ALL">{t('Tất cả chỉ số')}</option>
            {ALL_SENSOR_TYPES.map(st => (
              <option key={st} value={st}>
                {getSensorTypeDisplayName(st, t)} ({st})
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[#475569] dark:text-[#CBD5E1] cursor-pointer min-h-[44px] px-1">
          <input
            type="checkbox"
            data-testid="picker-filter-retired"
            checked={filterIncludeRetired}
            onChange={e => onChangeIncludeRetired(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#1F5CA9]"
          />
          <span>{t('Bao gồm nguồn đã ngừng sử dụng (RETIRED)')}</span>
        </label>

        {/* Registration shortcuts (UI05 / UI06) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="btn-open-register-node"
            onClick={onOpenRegisterNode}
            className="h-11 min-h-[44px] px-3 rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>{t('Đăng ký trạm / thiết bị')}</span>
          </button>
          <button
            type="button"
            data-testid="btn-open-register-stream"
            onClick={() => onOpenRegisterStream(null)}
            className="h-11 min-h-[44px] px-3 rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">sensors</span>
            <span>{t('Đăng ký luồng')}</span>
          </button>
        </div>
      </div>

      {/* Registry Error */}
      {error && (
        <div
          data-testid="picker-error-banner"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center justify-between gap-2"
        >
          <span>{getZoneSourceErrorMessage(error, t)}</span>
          <button
            type="button"
            data-testid="btn-retry-picker"
            onClick={onRetry}
            className="h-9 px-3 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 font-semibold whitespace-nowrap transition-colors"
          >
            {t('Thử lại')}
          </button>
        </div>
      )}

      {/* Streams List */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
          {t('Danh sách nguồn khả dụng')} ({filteredStreams.length})
        </div>

        {loading ? (
          <div className="space-y-2.5 animate-pulse">
            <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ) : filteredStreams.length === 0 ? (
          <div
            data-testid="picker-empty"
            className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-center text-xs text-[#475569] dark:text-[#94A3B8]"
          >
            {t('Không tìm thấy nguồn dữ liệu phù hợp bộ lọc.')}
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="picker-stream-list">
            {filteredStreams.map(stream => {
              const isSelected = stream.id === selectedStreamId;
              const supportMeta = getAcquisitionSupportMeta(stream.acquisitionSupport, t);
              const { eligible, reason } = getEligibility(
                stream,
                targetSensor,
                mode,
                replacingAssignment
              );

              return (
                <button
                  key={stream.id}
                  type="button"
                  data-testid={`picker-stream-card-${stream.id}`}
                  disabled={!eligible}
                  onClick={() => eligible && onSelectStream(stream.id)}
                  className={`w-full text-left rounded-xl p-3.5 transition-all space-y-2 ${
                    !eligible
                      ? 'opacity-70 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-[#CBD5E1] dark:border-[#334155] cursor-not-allowed'
                      : isSelected
                      ? 'border-2 border-[#1F5CA9] dark:border-[#60A5FA] bg-blue-50/40 dark:bg-blue-950/30 shadow-sm'
                      : 'border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                        {stream.provider.displayName || stream.provider.code} (#{stream.id})
                      </span>
                      <span
                        className={`h-[26px] px-2 rounded-[6px] text-[11px] font-semibold inline-flex items-center ${supportMeta.badgeClass}`}
                      >
                        {supportMeta.label}
                      </span>
                    </div>
                    <span className="h-[26px] px-2 rounded-[6px] bg-slate-100 dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] font-mono text-[11px] font-semibold inline-flex items-center">
                      {stream.sensorType}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#475569] dark:text-[#94A3B8]">{t('Định danh / kênh')}:</span>
                      <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] break-all">
                        {stream.externalNamespace.startsWith('TOPIC:')
                          ? stream.externalNamespace.slice(6)
                          : stream.externalId}
                      </span>
                    </div>
                    {stream.node && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#475569] dark:text-[#94A3B8]">{t('Trạm / thiết bị')}:</span>
                        <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                          {stream.node.kind} #{stream.node.externalId}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#475569] dark:text-[#94A3B8]">{t('Phiên bản mới nhất')}:</span>
                      <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                        v{stream.latestAssignmentVersion}
                      </span>
                    </div>
                  </div>

                  {reason ? (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-md p-2 border border-amber-200 dark:border-amber-800">
                      {reason}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[#64748B] dark:text-[#94A3B8] font-mono">
                        SRC-{stream.id}
                      </span>
                      <span className="font-semibold text-[#1F5CA9] dark:text-[#60A5FA] inline-flex items-center gap-1">
                        {isSelected ? (
                          <>
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>{t('Đã chọn nguồn này')}</span>
                          </>
                        ) : (
                          <span>{t('Chọn nguồn này')}</span>
                        )}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {nextAfterId !== null && (
          <button
            type="button"
            data-testid="btn-picker-load-more"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full h-11 min-h-[44px] rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1F5CA9] dark:text-[#60A5FA] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loadingMore ? t('Đang tải thêm...') : t('Tải thêm nguồn...')}
          </button>
        )}
      </div>

      {/* Selected stream refreshed verification box */}
      {selectedStreamId !== null && (
        <div
          data-testid="picker-selected-detail"
          className="p-3.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] text-xs space-y-1"
        >
          {detailLoading ? (
            <div className="text-[#475569] dark:text-[#94A3B8] animate-pulse">
              {t('Đang kiểm tra trạng thái mới nhất của nguồn đã chọn...')}
            </div>
          ) : detailError ? (
            <div className="text-red-700 dark:text-red-300">
              {getZoneSourceErrorMessage(detailError, t)}
            </div>
          ) : activeDetail ? (
            <>
              <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {t('Đã kiểm chứng từ máy chủ')}: #{activeDetail.id} · v{activeDetail.latestAssignmentVersion}
              </div>
              {activeEligibility.reason && (
                <div className="text-red-700 dark:text-red-300 font-medium">
                  {activeEligibility.reason}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Footer CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-picker-back"
          onClick={onBack}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('Quay lại')}
        </button>
        <button
          type="button"
          data-testid="btn-picker-proceed"
          disabled={!canProceed}
          onClick={onProceed}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mode === 'REPLACE' ? t('Tiếp tục thay nguồn') : t('Tiếp tục gán nguồn')}
        </button>
      </div>
    </div>
  );
}
