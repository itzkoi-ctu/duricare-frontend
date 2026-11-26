import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import type { StreamDiscovery } from '../../types/farmVisual';
import type {
  ParsedZoneSourceError,
  StoredPendingZoneSourceOperation,
  ZoneSourceAssignmentItem,
} from '../../types/zoneSource';

interface ZoneSourceConflictViewProps {
  error: ParsedZoneSourceError;
  pendingRecord: StoredPendingZoneSourceOperation;
  latestStreamDetail?: StreamDiscovery | null;
  latestAssignment?: ZoneSourceAssignmentItem | null;
  onRefreshStatus: () => void;
  onBackToMain: () => void;
}

export default function ZoneSourceConflictView({
  error,
  pendingRecord,
  latestStreamDetail,
  latestAssignment,
  onRefreshStatus,
  onBackToMain,
}: ZoneSourceConflictViewProps) {
  const cmd = pendingRecord.command;
  const submittedVersion =
    'newExpectedVersion' in cmd
      ? cmd.newExpectedVersion
      : 'oldExpectedVersion' in cmd
      ? cmd.oldExpectedVersion
      : '—';
  const submittedState =
    'expectedCurrentState' in cmd ? cmd.expectedCurrentState : pendingRecord.targetSnapshot?.assignmentState ?? '—';

  const latestVersion =
    latestAssignment?.latestAssignmentVersion ??
    latestAssignment?.version ??
    (latestStreamDetail ? String(latestStreamDetail.latestAssignmentVersion) : '—');
  const latestState =
    latestAssignment?.assignmentState ??
    (latestStreamDetail?.currentAssignment
      ? latestStreamDetail.currentAssignment.effectiveTo === null
        ? 'OPEN'
        : 'CLOSED'
      : latestStreamDetail
      ? 'NONE'
      : '—');

  return (
    <div data-testid="zs-conflict-view" className="space-y-5">
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3">
        <span className="material-symbols-outlined text-[24px] text-red-600 dark:text-red-400 shrink-0">
          sync_problem
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Xung đột phiên bản hoặc trạng thái nguồn (HTTP 409)')}
            </h3>
            <span className="h-[26px] px-2 rounded-[6px] bg-red-100 dark:bg-red-900/60 font-mono text-[11px] font-bold text-red-800 dark:text-red-200 inline-flex items-center">
              {error.code}
            </span>
          </div>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
            {getZoneSourceErrorMessage(error, t)}
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
          {t('So sánh trạng thái đã gửi và máy chủ')}
        </div>
        <div className="rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[#334155]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F1F5F9] dark:bg-[#162032] text-[#475569] dark:text-[#CBD5E1] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">{t('Thông số')}</th>
                <th className="py-2.5 px-3.5 font-semibold">{t('Yêu cầu đã gửi')}</th>
                <th className="py-2.5 px-3.5 font-semibold">{t('Mới nhất trên máy chủ')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
              <tr className="bg-white dark:bg-[#1E293B]">
                <td className="py-3 px-3.5 font-medium">{t('Phiên bản (Version)')}</td>
                <td className="py-3 px-3.5 font-mono text-[#475569] dark:text-[#CBD5E1]">
                  v{submittedVersion}
                </td>
                <td className="py-3 px-3.5 font-mono font-bold text-[#1F5CA9] dark:text-[#60A5FA]">
                  {latestVersion === '—' ? '—' : `v${latestVersion}`}
                </td>
              </tr>
              <tr className="bg-[#F8FAFC] dark:bg-[#162032]">
                <td className="py-3 px-3.5 font-medium">{t('Trạng thái gán')}</td>
                <td className="py-3 px-3.5 font-mono text-[#475569] dark:text-[#CBD5E1]">
                  {submittedState}
                </td>
                <td className="py-3 px-3.5 font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {latestState}
                </td>
              </tr>
              {'reason' in cmd && (
                <tr className="bg-white dark:bg-[#1E293B]">
                  <td className="py-3 px-3.5 font-medium">{t('Lý do đã nhập')}</td>
                  <td colSpan={2} className="py-3 px-3.5 text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {cmd.reason}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-conflict-refresh"
          onClick={onRefreshStatus}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('Làm mới trạng thái khu vực')}
        </button>
        <button
          type="button"
          data-testid="btn-conflict-back"
          onClick={onBackToMain}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors"
        >
          {t('Đóng & Kiểm tra lại')}
        </button>
      </div>
    </div>
  );
}
