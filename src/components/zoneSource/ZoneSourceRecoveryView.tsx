import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import {
  extractReceiptNode,
  extractReceiptStream,
  type ParsedZoneSourceError,
  type StoredPendingZoneSourceOperation,
  type ZoneSourceReceipt,
} from '../../types/zoneSource';
import { formatGmt7DateTime } from '../../utils/zoneSourceValidation';
import { getOperationKindLabel } from './zoneSourceLabels';

interface ZoneSourceUnknownViewProps {
  pendingRecord: StoredPendingZoneSourceOperation;
  receipt404: boolean;
  error?: ParsedZoneSourceError | null;
  checkingReceipt: boolean;
  retrying: boolean;
  storageUnavailable: boolean;
  onCheckReceipt: () => void;
  onRetrySameRequest: () => void;
  onRequestLeave: () => void;
}

export function ZoneSourceUnknownView({
  pendingRecord,
  receipt404,
  error,
  checkingReceipt,
  retrying,
  storageUnavailable,
  onCheckReceipt,
  onRetrySameRequest,
  onRequestLeave,
}: ZoneSourceUnknownViewProps) {
  const snapshot = pendingRecord.targetSnapshot;
  const cmd = pendingRecord.command;

  return (
    <div data-testid="zs-unknown-view" className="space-y-5">
      {/* Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
        <span className="material-symbols-outlined text-[24px] text-amber-700 dark:text-amber-300 shrink-0">
          wifi_off
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Chưa xác nhận kết quả thao tác')}
          </h3>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
            {t(
              'Kết nối bị gián đoạn hoặc quá thời gian chờ. Yêu cầu thao tác của bạn có thể vẫn đang được ghi nhận hoặc xử lý ngầm trên máy chủ. Hệ thống không tự gửi lại để tránh trùng lặp.'
            )}
          </p>
        </div>
      </div>

      {/* Intent Summary */}
      <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
          {t('Tóm tắt tác vụ đang chờ xác nhận')}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
          <div>
            {t('Thao tác')}:{' '}
            <strong className="text-[#1F5CA9] dark:text-[#60A5FA]">
              {getOperationKindLabel(pendingRecord.kind, t)}
            </strong>
          </div>
          <div>
            {t('Đối tượng')}:{' '}
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
              {snapshot
                ? `${snapshot.providerLabel} #${snapshot.streamId}`
                : pendingRecord.zoneCode}
            </strong>
          </div>
        </div>
        {'reason' in cmd && (
          <div className="text-xs text-[#475569] dark:text-[#CBD5E1] pt-1">
            {t('Lý do đã nhập')}: “{cmd.reason}”
          </div>
        )}
      </div>

      {/* Receipt 404 Distinct Notice */}
      {receipt404 && (
        <div
          data-testid="zs-receipt-404-notice"
          className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#CBD5E1] dark:border-[#334155] flex items-start gap-2.5 text-xs"
        >
          <span className="material-symbols-outlined text-[20px] text-[#64748B] shrink-0">
            search_off
          </span>
          <div className="space-y-0.5">
            <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Biên nhận HTTP 404 (Chưa tìm thấy biên nhận)')}
            </div>
            <p className="text-[#475569] dark:text-[#94A3B8]">
              {t(
                'Chưa tìm thấy biên nhận; yêu cầu có thể vẫn đang được xử lý ngầm (Không kết luận thao tác thất bại).'
              )}
            </p>
          </div>
        </div>
      )}

      {error && !receipt404 && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
          {getZoneSourceErrorMessage(error, t)}
        </div>
      )}

      {/* Technical Operation UUID Disclosure */}
      <details
        data-testid="unknown-operation-id-disclosure"
        className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#162032] overflow-hidden group"
      >
        <summary className="px-4 py-2.5 min-h-[44px] cursor-pointer flex items-center justify-between text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
          <span>{t('Mã yêu cầu kỹ thuật (Idempotency Key / UUID không đổi)')}</span>
          <span className="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">
            expand_more
          </span>
        </summary>
        <div
          data-testid="unknown-operation-uuid"
          className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#334155] font-mono text-xs text-[#0F172A] dark:text-[#F8FAFC] select-all break-all"
        >
          {pendingRecord.operationId}
        </div>
      </details>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-unknown-leave"
          disabled={checkingReceipt || retrying}
          onClick={onRequestLeave}
          className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {t('Rời màn hình')}
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            data-testid="btn-unknown-retry-same"
            disabled={checkingReceipt || retrying || storageUnavailable}
            onClick={onRetrySameRequest}
            className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {retrying ? t('Đang gửi lại...') : t('Thử lại cùng yêu cầu')}
          </button>

          <button
            type="button"
            data-testid="btn-unknown-check-receipt"
            disabled={checkingReceipt || retrying}
            onClick={onCheckReceipt}
            className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{checkingReceipt ? t('Đang kiểm tra...') : t('Kiểm tra kết quả')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ZoneSourceReceiptResultViewProps {
  receipt: ZoneSourceReceipt;
  liveStatusError: ParsedZoneSourceError | null;
  reloadingStatus: boolean;
  onReloadLiveStatus: () => void;
  onDone: () => void;
}

export function ZoneSourceReceiptResultView({
  receipt,
  liveStatusError,
  reloadingStatus,
  onReloadLiveStatus,
  onDone,
}: ZoneSourceReceiptResultViewProps) {
  const beforeStream = receipt.before.streams?.[0];
  const afterStream = receipt.after.streams?.[0];
  const receiptNode = extractReceiptNode(receipt.after);
  const receiptStream = extractReceiptStream(receipt.after);

  return (
    <div data-testid="zs-receipt-result-view" className="space-y-5">
      {/* Historic Receipt Success Banner */}
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
        <span className="material-symbols-outlined text-[24px] text-emerald-700 dark:text-emerald-300 shrink-0">
          task_alt
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {t('Tác vụ đã được ghi nhận (Bản ghi lịch sử bất biến)')}
            </h3>
            {receipt.replayed && (
              <span className="h-[26px] px-2 rounded-[6px] bg-blue-100 dark:bg-blue-900/60 text-[11px] font-semibold text-[#1F5CA9] dark:text-[#60A5FA] inline-flex items-center">
                {t('Biên nhận trùng lặp (Replayed)')}
              </span>
            )}
          </div>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
            {t('Thời điểm ghi nhận')}:{' '}
            <strong className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {formatGmt7DateTime(receipt.appliedAt)}
            </strong>
          </p>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
            {t('Lý do')}: {receipt.reason}
          </p>
        </div>
      </div>

      {/* Immutable Ledger Comparison */}
      {afterStream && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            {t('Đối chiếu trước và sau khi thực hiện (Biên nhận)')}
          </span>
          <div className="rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[#334155]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F1F5F9] dark:bg-[#162032] text-[#475569] dark:text-[#CBD5E1] text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Thuộc tính')}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Trước thao tác')}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Sau thao tác (Biên nhận)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                <tr className="bg-white dark:bg-[#1E293B]">
                  <td className="py-3 px-3.5 font-medium">{t('Mã luồng / Gán')}</td>
                  <td className="py-3 px-3.5 font-mono text-[#475569] dark:text-[#CBD5E1]">
                    {beforeStream?.assignment
                      ? `#${beforeStream.assignment.assignmentId} (v${beforeStream.assignment.version})`
                      : t('Chưa có')}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-[#1F5CA9] dark:text-[#60A5FA]">
                    {afterStream.assignment
                      ? `#${afterStream.assignment.assignmentId} (v${afterStream.assignment.version})`
                      : '—'}
                  </td>
                </tr>
                <tr className="bg-[#F8FAFC] dark:bg-[#162032]">
                  <td className="py-3 px-3.5 font-medium">{t('Hiệu lực')}</td>
                  <td className="py-3 px-3.5 text-[#475569] dark:text-[#CBD5E1]">
                    {beforeStream?.assignment
                      ? beforeStream.assignment.effectiveTo
                        ? t('Đã đóng')
                        : t('Đang mở (OPEN)')
                      : t('Chưa gán')}
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {afterStream.assignment
                      ? afterStream.assignment.effectiveTo
                        ? t('Đã đóng (CLOSED)')
                        : t('Đang mở (OPEN)')
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registry node/stream creation summary */}
      {receiptNode && (
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
          <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Trạm/thiết bị đã lưu')}: #{receiptNode.id} ({receiptNode.kind})
          </div>
          <div className="font-mono text-[#475569] dark:text-[#CBD5E1]">
            externalId: {receiptNode.externalId}
          </div>
        </div>
      )}

      {receiptStream && (
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
          <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Luồng đã lưu')}: #{receiptStream.id} ({receiptStream.sensorType})
          </div>
          <div className="font-mono text-[#475569] dark:text-[#CBD5E1] break-all">
            {receiptStream.externalNamespace}
          </div>
        </div>
      )}

      {/* Honest Stop Effects Note */}
      {receipt.effects.legacyMqttMayContinue && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          {t('Lưu ý: Kênh MQTT khu vực có thể vẫn tiếp nhận gói tin legacy; phần mềm không tắt thiết bị/broker.')}
        </div>
      )}

      {/* Split Live Current State Warning Banner (when live read failed 503 after historic 200 receipt!) */}
      {liveStatusError ? (
        <div
          data-testid="receipt-live-status-warning"
          className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5 text-amber-950 dark:text-amber-200">
            <span className="material-symbols-outlined text-[20px] text-amber-700 dark:text-amber-300 shrink-0">
              warning
            </span>
            <div>
              <div className="font-bold">
                {t('Chưa tải được trạng thái hiện tại ({0})', [liveStatusError.status || liveStatusError.code])}
              </div>
              <p className="opacity-90">
                {t('Biên nhận lịch sử đã được bảo đảm, nhưng chưa thể đồng bộ trạng thái tức thời của khu vực.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-receipt-reload-live"
            disabled={reloadingStatus}
            onClick={onReloadLiveStatus}
            className="h-9 px-3 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-semibold whitespace-nowrap transition-colors"
          >
            {reloadingStatus ? t('Đang tải...') : t('Tải trạng thái hiện tại')}
          </button>
        </div>
      ) : (
        <div
          data-testid="receipt-live-status-synced"
          className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#162032] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-2 text-xs text-[#475569] dark:text-[#CBD5E1]"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>{t('Trạng thái hiện tại của khu vực đã được đồng bộ.')}</span>
          </div>
          <span className="font-mono text-[11px]">{receipt.resultSemantics}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          data-testid="btn-receipt-done"
          onClick={onDone}
          className="h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors"
        >
          {t('Hoàn tất & Trở về')}
        </button>
      </div>
    </div>
  );
}
