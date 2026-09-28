import useCareLogs from '../hooks/useCareLogs';
import { ACTION_TYPE_LABELS } from '../types/careLog';
import { formatRelativeTime } from '../utils/formatTime';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

interface CareLogTimelineProps {
  zoneCode: string;
}

export default function CareLogTimeline({ zoneCode }: CareLogTimelineProps) {
  const { logs, loading, error, retry } = useCareLogs(zoneCode);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-2xl text-center">
        <div className="text-4xl mb-3">📝</div>
        <h3 className="text-base font-semibold text-text mb-1">
          Chưa có nhật ký chăm sóc
        </h3>
        <p className="text-xs text-gray max-w-sm">
          Chưa có ghi nhận công việc chăm sóc nào cho vùng canh tác <strong>{zoneCode}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h3 className="text-base font-bold text-text mb-6 flex items-center gap-2">
        <span>📜</span> Lịch sử chăm sóc ({logs.length})
      </h3>

      {/* Vertical Timeline Container */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-border space-y-8">
        {logs.map((log) => {
          const actionInfo = ACTION_TYPE_LABELS[log.actionType] ?? {
            label: log.actionType,
            icon: '📋',
          };
          const formattedDate = log.performedAt
            ? new Date(log.performedAt).toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return (
            <div key={log.id} className="relative group">
              {/* Timeline Bullet Node Icon */}
              <div
                className="absolute -left-[31px] sm:-left-[39px] top-0 w-8 h-8 rounded-full
                           bg-surface border-2 border-navy flex items-center justify-center
                           text-sm shadow-sm group-hover:scale-110 transition-transform"
              >
                {actionInfo.icon}
              </div>

              {/* Log Card Content */}
              <div className="bg-bg border border-border rounded-xl p-4 space-y-2.5 shadow-sm">
                {/* Header: Action type & Date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text">
                      {actionInfo.label}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy/10 text-navy font-medium">
                      {log.actionType}
                    </span>
                  </div>

                  {/* Date timestamp & relative time */}
                  <div className="text-xs text-gray font-medium flex items-center gap-1.5">
                    {log.performedAt ? (
                      <span title={formattedDate ?? undefined}>
                        ⏱️ {formatRelativeTime(log.performedAt)}
                        {formattedDate && <span className="ml-1 opacity-75">({formattedDate})</span>}
                      </span>
                    ) : (
                      <span>⏱️ Vừa ghi nhận</span>
                    )}
                  </div>
                </div>

                {/* Performed by tag */}
                {log.performBy && (
                  <div className="flex items-center gap-1.5 text-xs text-teal font-medium">
                    <span>👤 Người thực hiện:</span>
                    <span className="font-semibold text-text">{log.performBy}</span>
                  </div>
                )}

                {/* Note / Description */}
                {log.note && (
                  <p className="text-xs sm:text-sm text-text/90 bg-surface/70 border border-border/50 rounded-lg p-3 leading-relaxed">
                    {log.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
