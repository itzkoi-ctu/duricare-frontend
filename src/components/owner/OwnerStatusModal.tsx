import { useState, useEffect, useRef, type FormEvent } from 'react';
import { t } from '../../i18n';
import { updateOwnerStatus, getOwner } from '../../api/owner';
import type { OwnerResponse } from '../../types/owner';
import OwnerStatusBadge from './OwnerStatusBadge';

interface OwnerStatusModalProps {
  owner: OwnerResponse;
  action: 'LOCK' | 'UNLOCK';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: OwnerResponse) => void;
}

export default function OwnerStatusModal({
  owner: initialOwner,
  action,
  isOpen,
  onClose,
  onSuccess,
}: OwnerStatusModalProps) {
  const [currentOwner, setCurrentOwner] = useState<OwnerResponse>(initialOwner);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictOccurred, setConflictOccurred] = useState(false);
  const [networkTimeoutWarning, setNetworkTimeoutWarning] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setCurrentOwner(initialOwner);
  }, [initialOwner]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      setReason('');
      setErrorMessage(null);
      setConflictOccurred(false);
      setNetworkTimeoutWarning(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Handle Escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isRefreshing) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements).filter(el => !el.hasAttribute('disabled'));
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isRefreshing, onClose]);

  if (!isOpen) return null;

  const isLock = action === 'LOCK';
  const targetEnabled = !isLock; // LOCK => enabled: false; UNLOCK => enabled: true
  const strippedReason = reason.trim();
  const charCount = strippedReason.length;
  const isReasonValid = charCount >= 1 && charCount <= 4000;

  const handleRefreshLatest = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const latest = await getOwner(currentOwner.id);
      setCurrentOwner(latest);
      setConflictOccurred(false);
      if (latest.enabled === targetEnabled) {
        setErrorMessage(
          isLock
            ? t("Tài khoản đã ở trạng thái đã khóa bởi một quản trị viên khác.")
            : t("Tài khoản đã ở trạng thái hoạt động bởi một quản trị viên khác.")
        );
      }
    } catch {
      setErrorMessage(t("Không thể tải dữ liệu mới nhất. Vui lòng thử lại."));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isReasonValid || isSubmitting || isRefreshing || conflictOccurred || currentOwner.enabled === targetEnabled) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setConflictOccurred(false);
    setNetworkTimeoutWarning(false);

    try {
      const updated = await updateOwnerStatus(currentOwner.id, {
        version: currentOwner.version,
        enabled: targetEnabled,
        reason: strippedReason,
      });

      onSuccess(updated);
    } catch (err: unknown) {
      const error = err as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };

      if (error.response?.status === 409) {
        // Optimistic locking conflict: Keep reason intact!
        setConflictOccurred(true);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response) {
        setNetworkTimeoutWarning(true);
      } else if (error.response?.status === 400) {
        setErrorMessage(error.response?.data?.message || t("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại lý do."));
      } else {
        setErrorMessage(t("Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại sau."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget && !isSubmitting && !isRefreshing) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-dialog-title"
        className="w-full max-w-full sm:max-w-[520px] rounded-t-3xl sm:rounded-xl rounded-b-none sm:rounded-b-xl bg-surface border-t sm:border border-border shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]"
      >
        {/* Mobile Bottom Sheet Handle */}
        <div className="w-10 h-1 rounded-full bg-[#cbd5e1] dark:bg-border mx-auto mt-3 -mb-1 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={`material-symbols-outlined ${isLock ? 'text-red-600' : 'text-[#1f5ca9]'}`}
            >
              {isLock ? 'lock' : 'lock_open'}
            </span>
            <h2 id="status-dialog-title" className="text-base font-bold text-text">
              {isLock ? t("Khóa tài khoản chủ vườn") : t("Mở khóa tài khoản chủ vườn")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isRefreshing}
            aria-label={t("Đóng")}
            className="p-1 rounded-lg text-gray hover:text-text hover:bg-border/40 transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              close
            </span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-4 text-sm flex-1">
            {/* Account & Farm Summary */}
            <div className="p-3.5 bg-bg rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray">{t("Tài khoản:")}</span>
                <span className="font-mono font-medium text-xs text-text break-all">
                  {currentOwner.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray">{t("Vườn liên kết:")}</span>
                <span className="font-semibold text-xs text-[#1f5ca9] dark:text-blue-400">
                  {currentOwner.farmName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray">{t("Trạng thái hiện hành:")}</span>
                <OwnerStatusBadge enabled={currentOwner.enabled} />
              </div>
            </div>

            {/* Impact / Notice Banner */}
            {isLock ? (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-900 dark:text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    warning
                  </span>
                  <span>{t("Hành động ảnh hưởng đến quyền truy cập")}</span>
                </div>
                <p className="leading-relaxed">
                  {t("Khi bị khóa, chủ vườn sẽ không thể đăng nhập hoặc đồng bộ nhật ký chăm sóc. Phiên cũ sẽ bị từ chối ở yêu cầu tiếp theo.")}
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-[#eff4ff] dark:bg-blue-950/40 border border-[#cbdbf5] dark:border-blue-800/60 rounded-lg text-xs text-[#1e40af] dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#1f5ca9] dark:text-blue-400">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    info
                  </span>
                  <span>{t("Lưu ý kích hoạt & Đăng nhập mới")}</span>
                </div>
                <p className="leading-relaxed">
                  {t("Sau khi mở khóa, tài khoản chủ vườn có thể đăng nhập bình thường. Chủ vườn cần thực hiện phiên đăng nhập mới (fresh login) bằng mật khẩu hiện tại để cấp lại mã xác thực phiên làm việc.")}
                </p>
              </div>
            )}

            {/* Conflict Warning (409) */}
            {conflictOccurred && (
              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span aria-hidden="true" className="material-symbols-outlined text-amber-600 text-base">
                    sync_problem
                  </span>
                  <span>{t("Xung đột phiên bản dữ liệu (HTTP 409 State Conflict)")}</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  {t("Trạng thái tài khoản vừa được thay đổi bởi một quản trị viên khác. Lý do bạn đã nhập vẫn ở trong biểu mẫu.")}
                </p>
                <button
                  type="button"
                  onClick={handleRefreshLatest}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isRefreshing ? (
                    <>
                      <span aria-hidden="true" className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t("Đang tải dữ liệu...")}</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="material-symbols-outlined text-sm">
                        refresh
                      </span>
                      <span>{t("Tải lại dữ liệu mới nhất (Giữ nguyên lý do)")}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Network Timeout Warning */}
            {networkTimeoutWarning && (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1f5ca9] dark:text-blue-300">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    wifi_off
                  </span>
                  <span>{t("Mạng bị ngắt giữa chừng khi ghi nhận (Timeout Gate)")}</span>
                </div>
                <p className="text-xs text-text leading-relaxed">
                  {t("Yêu cầu đã gửi nhưng máy chủ chưa kịp phản hồi biên nhận. Vui lòng kiểm tra trạng thái trước khi thử lại để tránh ghi trùng nhật ký kiểm toán.")}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshLatest}
                    className="h-8 px-3 rounded-lg bg-[#1f5ca9] text-white text-xs font-semibold hover:bg-[#174987] transition-colors cursor-pointer"
                  >
                    {t("Kiểm tra trạng thái")}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 px-3 rounded-lg border border-border bg-surface text-text text-xs font-medium hover:bg-border/40 transition-colors cursor-pointer"
                  >
                    {t("Đóng")}
                  </button>
                </div>
              </div>
            )}

            {/* General Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Reason Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="status-change-reason" className="block text-xs font-semibold text-text">
                  {isLock ? t("Lý do khóa tài khoản") : t("Lý do mở khóa tài khoản")}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray">{t("Bắt buộc nhập")}</span>
              </div>
              <textarea
                ref={textareaRef}
                id="status-change-reason"
                required
                maxLength={4000}
                rows={3}
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting || isRefreshing}
                placeholder={
                  isLock
                    ? t("Nêu rõ lý do tạm ngưng quyền truy cập của chủ vườn...")
                    : t("Nêu căn cứ mở khóa tài khoản...")
                }
                className="w-full min-h-[110px] p-3 rounded-lg border border-border bg-bg text-base md:text-sm text-text focus:outline-none focus:ring-2 focus:ring-[#1f5ca9]/20 focus:border-[#1f5ca9] transition-colors resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-gray">
                <span>{t("Nhập từ 1 đến 4.000 ký tự sau khi bỏ khoảng trắng đầu, cuối.")}</span>
                <span className="font-mono">
                  {charCount} / 4.000 {t("ký tự")}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-6 sm:py-4 bg-[#f8fafc] dark:bg-surface/60 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
            <button
              type="submit"
              disabled={!isReasonValid || isSubmitting || isRefreshing || conflictOccurred || currentOwner.enabled === targetEnabled}
              className={`order-1 sm:order-2 w-full sm:w-auto h-11 px-5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs ${
                isLock
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#1f5ca9] hover:bg-[#174987]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("Đang xử lý...")}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    {isLock ? 'lock' : 'lock_open'}
                  </span>
                  <span>{isLock ? t("Khóa tài khoản") : t("Mở tài khoản")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isRefreshing}
              className="order-2 sm:order-1 w-full sm:w-auto h-11 px-4 rounded-lg border border-border bg-surface text-text hover:bg-border/40 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("Hủy")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
