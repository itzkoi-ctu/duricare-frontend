import { Link } from 'react-router-dom';
import type { LatestInsight } from '../types/overview';
import { formatRelativeTime } from '../utils/formatTime';

interface TopInsightCardProps {
  insight?: LatestInsight | null;
}

export default function TopInsightCard({ insight }: TopInsightCardProps) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 md:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-teal">
              psychology
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray">
              Khuyến nghị AI
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal/15 text-teal uppercase tracking-wider">
            CTU Agent
          </span>
        </div>

        {/* Content */}
        {insight ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray mb-1">
              <span className="font-semibold text-navy dark:text-blue">
                {insight.zoneCode ? `Khu: ${insight.zoneCode}` : 'Toàn vườn'}
              </span>
              <span className="text-[10px]">{formatRelativeTime(insight.createdAt)}</span>
            </div>

            <p className="text-xs text-text leading-relaxed line-clamp-3">
              {insight.message}
            </p>
          </div>
        ) : (
          <div className="mt-2 text-center py-3">
            <span className="text-xl block mb-1">🌿</span>
            <p className="text-xs text-gray">
              Chưa có khuyến nghị mới từ Trợ lý AI
            </p>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[11px] text-gray">Tư vấn nông vụ</span>
        <Link
          to="/agent"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
        >
          <span>Hỏi trợ lý</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
