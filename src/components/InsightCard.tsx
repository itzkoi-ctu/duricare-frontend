import { Link } from 'react-router-dom';
import type { LatestInsight } from '../types/overview';
import { formatRelativeTime } from '../utils/formatTime';

interface InsightCardProps {
  insight: LatestInsight | null;
}

export default function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-5 md:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy dark:text-blue flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">smart_toy</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-text">Trợ lý AI Nông vụ DuriCare</h3>
                <span className="px-1.5 py-0.5 rounded bg-teal/15 text-teal text-[10px] font-bold">
                  CTU Agent
                </span>
              </div>
              <p className="text-xs text-gray">Mô hình Chuyên gia Sinh lý Sầu riêng</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal/10 text-teal text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            Trực tuyến
          </span>
        </div>

        {/* Content Body */}
        {insight ? (
          <div className="mt-4 p-4 rounded-xl bg-bg border border-border/60">
            <div className="flex items-center justify-between text-xs text-gray mb-1.5">
              {insight.zoneCode ? (
                <span className="font-semibold text-navy dark:text-blue">
                  Khu vực: {insight.zoneCode}
                </span>
              ) : (
                <span className="font-semibold text-text">Toàn nông trại</span>
              )}
              <span>{formatRelativeTime(insight.createdAt)}</span>
            </div>
            <p className="text-sm text-text leading-relaxed font-normal">
              {insight.message}
            </p>
          </div>
        ) : (
          <div className="mt-4 p-6 rounded-xl bg-bg border border-border/60 text-center">
            <span className="text-2xl mb-1 block">🌿</span>
            <p className="text-sm font-medium text-text mb-1">
              Chưa có khuyến nghị AI mới
            </p>
            <p className="text-xs text-gray max-w-md mx-auto">
              Hệ thống AI đang liên tục phân tích vi khí hậu và độ ẩm đất. Các khuyến nghị dinh dưỡng và phòng trừ sinh học sẽ tự động xuất hiện tại đây.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between border-t border-border/50">
        <span className="text-xs text-gray">
          {insight ? 'Cần làm rõ phương án chăm sóc?' : 'Cần tư vấn nông vụ trực tiếp?'}
        </span>
        <Link
          to="/agent"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal text-white hover:bg-teal/90 text-sm font-semibold shadow-2xs transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span>Hỏi trợ lý</span>
        </Link>
      </div>
    </div>
  );
}
