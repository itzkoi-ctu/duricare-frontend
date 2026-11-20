import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { getLayoutOperation } from '../../api/farmVisual';
import type { MutationReceipt } from '../../types/farmVisual';

interface LayoutConflictModalProps {
  isOpen: boolean;
  type: '409_CONFLICT' | 'TIMEOUT_UNCERTAINTY';
  farmId: number;
  operationId: string | null;
  errorCode?: string;
  errorMessage?: string;
  onReloadLatest: (farmId: number) => void;
  onRetrySameOperation: (farmId: number) => void;
  onVerifiedReceipt: (receipt: MutationReceipt, farmId: number) => void;
  onClose: () => void;
}

export default function LayoutConflictModal({
  isOpen,
  type,
  farmId,
  operationId,
  errorCode,
  errorMessage,
  onReloadLatest,
  onRetrySameOperation,
  onVerifiedReceipt,
  onClose,
}: LayoutConflictModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!operationId) return;
    setVerifying(true);
    setVerifyStatus(null);

    try {
      const receipt = await getLayoutOperation(farmId, operationId);
      setVerifyStatus(t('Đã tìm thấy biên nhận hợp lệ! Đang đồng bộ sơ đồ...'));
      setTimeout(() => {
        onVerifiedReceipt(receipt, farmId);
      }, 500);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setVerifyStatus(
          t('Chưa tìm thấy biên nhận trên máy chủ (HTTP 404). Yêu cầu trước đó có thể chưa được xử lý, bạn có thể bấm "Thử lại cùng yêu cầu".'),
        );
      } else {
        setVerifyStatus(t('Không thể kết nối máy chủ để kiểm tra trạng thái. Vui lòng kiểm tra lại đường truyền.'));
      }
    } finally {
      setVerifying(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative w-full max-w-[500px] bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        {type === '409_CONFLICT' ? (
          <>
            {/* 409 Conflict Recovery */}
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-2xl">sync_problem</span>
              <h2 id="recovery-modal-title" className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
                {t('Xung đột phiên bản dữ liệu (HTTP 409)')}
              </h2>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <p className="leading-relaxed">
                {errorMessage ||
                  t('Sơ đồ vườn hoặc danh mục khu vực vừa được cập nhật bởi một người dùng khác (Mã: {0}). Hệ thống đã bảo toàn bản vẽ bạn vừa chỉnh sửa.', [errorCode || '409'])}
              </p>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {t('Bản phác thảo hiện tại của bạn vẫn được lưu trên màn hình.')}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-[44px] min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                {t('Giữ nguyên màn hình')}
              </button>
              <button
                type="button"
                onClick={() => onReloadLatest(farmId)}
                className="h-[44px] min-h-[44px] px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">sync</span>
                <span>{t('Tải lại dữ liệu mới nhất')}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Timeout Uncertainty Recovery */}
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <span className="material-symbols-outlined text-2xl">wifi_off</span>
              <h2 id="recovery-modal-title" className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
                {t('Chưa xác định kết quả lưu (Timeout / Mạng ngắt)')}
              </h2>
            </div>

            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed">
                {t('Yêu cầu lưu cấu hình sơ đồ đã được gửi đi nhưng phản hồi từ máy chủ bị gián đoạn. Thao tác gửi tiếp đã bị khóa tạm thời để tránh tạo trùng lặp.')}
              </p>

              {operationId && (
                <div className="font-mono text-[11px] p-2 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 break-all text-slate-600 dark:text-slate-400">
                  Operation-Token: {operationId}
                </div>
              )}

              {verifyStatus && (
                <div className="p-2.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs">
                  {verifyStatus}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !operationId}
                className="h-[44px] min-h-[44px] px-4 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('Đang đọc biên nhận...')}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>{t('Kiểm tra trạng thái')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onRetrySameOperation(farmId)}
                className="h-[44px] min-h-[44px] px-4 rounded-xl border border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>{t('Thử lại cùng yêu cầu')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-[44px] min-h-[44px] px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {t('Đóng')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
