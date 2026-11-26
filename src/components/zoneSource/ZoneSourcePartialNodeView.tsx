import { t } from '../../i18n';
import type { RetainedNodeMetadata } from '../../types/zoneSource';

interface ZoneSourcePartialNodeViewProps {
  retainedNode: RetainedNodeMetadata;
  onContinueStream: () => void;
  onDefer: () => void;
}

export default function ZoneSourcePartialNodeView({
  retainedNode,
  onContinueStream,
  onDefer,
}: ZoneSourcePartialNodeViewProps) {
  return (
    <div data-testid="zs-partial-node-retained" className="space-y-5">
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
        <span className="material-symbols-outlined text-[24px] text-amber-700 dark:text-amber-300 shrink-0">
          verified
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Trạm / thiết bị đã được tạo thành công và giữ lại trong phiên')}
          </h3>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
            {t('Bạn chưa hoàn tất đăng ký luồng cho trạm này. Trạm mới tạo vẫn được giữ nguyên trong Registry và không bị xóa bỏ.')}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-[#475569] dark:text-[#94A3B8]">{t('Nhà cung cấp')}:</span>
          <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{retainedNode.providerLabel}</strong>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#475569] dark:text-[#94A3B8]">{t('Mã nút đã giữ lại')}:</span>
          <strong className="font-mono text-[#1F5CA9] dark:text-[#60A5FA]">
            #{retainedNode.nodeId} ({retainedNode.nodeKind})
          </strong>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#475569] dark:text-[#94A3B8]">External ID:</span>
          <strong className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
            {retainedNode.externalId}
          </strong>
        </div>
        {retainedNode.displayName && (
          <div className="flex justify-between gap-2">
            <span className="text-[#475569] dark:text-[#94A3B8]">{t('Tên hiển thị')}:</span>
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{retainedNode.displayName}</strong>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-partial-node-defer"
          onClick={onDefer}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('Để sau')}
        </button>
        <button
          type="button"
          data-testid="btn-partial-node-continue"
          onClick={onContinueStream}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors"
        >
          {t('Đăng ký luồng cho trạm này')}
        </button>
      </div>
    </div>
  );
}
