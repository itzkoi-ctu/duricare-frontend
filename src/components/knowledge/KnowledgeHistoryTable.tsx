import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { AuditResponse } from '../../types/governance';
import KnowledgeStatusBadge from './KnowledgeStatusBadge';

interface KnowledgeHistoryTableProps {
  events: AuditResponse[];
  loading?: boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const ACTION_LABELS: Record<string, string> = {
  SOURCE_CREATED: 'Tạo nguồn tri thức',
  DRAFT_SAVED: 'Lưu bản nháp',
  REVISION_CREATED: 'Tạo phiên bản mới',
  SUBMITTED: 'Gửi thẩm định',
  WITHDRAWN: 'Rút hồ sơ',
  ASSIGNED: 'Phân công thẩm định',
  REASSIGNED: 'Phân công lại',
  DECIDED: 'Có quyết định thẩm định',
};

export default function KnowledgeHistoryTable({ events, loading = false }: KnowledgeHistoryTableProps) {
  useLanguage();

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-gray">
        <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin mx-auto mb-2" />
        <span>{t('Đang tải lịch sử kiểm toán...')}</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-gray rounded-xl border border-border bg-bg/40">
        <span aria-hidden="true" className="material-symbols-outlined text-2xl text-gray">
          history
        </span>
        <p className="mt-1">{t('Chưa có bản ghi kiểm toán nào.')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-bg/75 text-gray font-semibold">
          <tr>
            <th className="px-4 py-3">{t('Thời gian')}</th>
            <th className="px-4 py-3">{t('Người thực hiện')}</th>
            <th className="px-4 py-3">{t('Hành động')}</th>
            <th className="px-4 py-3">{t('Chuyển trạng thái')}</th>
            <th className="px-4 py-3">{t('Phiên bản')}</th>
            <th className="px-4 py-3">{t('Lý do / Ghi chú')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {events.map(ev => {
            const actionText = ACTION_LABELS[ev.action] || ev.action;
            return (
              <tr key={ev.id} className="hover:bg-bg/40 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-gray font-mono">
                  {formatDate(ev.occurredAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-text">
                  {ev.actorDisplayName || `User #${ev.actorUserId}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold text-text">{t(actionText)}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {ev.newStatus ? (
                    <div className="flex items-center gap-1.5">
                      {ev.previousStatus && (
                        <>
                          <KnowledgeStatusBadge status={ev.previousStatus} size="sm" showIcon={false} />
                          <span className="text-gray text-[10px]">→</span>
                        </>
                      )}
                      <KnowledgeStatusBadge status={ev.newStatus} size="sm" showIcon={false} />
                    </div>
                  ) : (
                    <span className="text-gray">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-gray">
                  {ev.newVersion !== null ? `v${ev.newVersion}` : '—'}
                </td>
                <td className="px-4 py-3 text-text max-w-xs [overflow-wrap:anywhere]">
                  {ev.reason || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
