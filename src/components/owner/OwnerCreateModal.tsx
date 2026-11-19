import { useState, useEffect, useRef, type FormEvent } from 'react';
import { t } from '../../i18n';
import { createOwner } from '../../api/owner';
import { getFarms } from '../../api/farms';
import type { Farm } from '../../types/farm';
import type { OwnerResponse } from '../../types/owner';

interface OwnerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (owner: OwnerResponse) => void;
}

export default function OwnerCreateModal({ isOpen, onClose, onSuccess }: OwnerCreateModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmId, setFarmId] = useState<number | ''>('');
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture trigger element and restore focus when closed
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      // Focus email input after render
      setTimeout(() => emailInputRef.current?.focus(), 50);
    } else {
      // Clear password from memory immediately
      setPassword('');
      setEmail('');
      setFarmId('');
      setEmailError(null);
      setPasswordError(null);
      setFormError(null);
      setShowPassword(false);
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Load farms when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setFarmsLoading(true);
    getFarms()
      .then(data => {
        if (!cancelled) setFarms(data);
      })
      .catch(() => {
        if (!cancelled) setFormError(t("Không thể tải danh sách vườn canh tác."));
      })
      .finally(() => {
        if (!cancelled) setFarmsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Handle Escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
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
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError(t("Vui lòng nhập email đăng nhập."));
      valid = false;
    } else if (trimmedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError(t("Định dạng email không hợp lệ."));
      valid = false;
    }

    if (!password) {
      setPasswordError(t("Vui lòng nhập mật khẩu ban đầu."));
      valid = false;
    } else {
      const utf8Bytes = new TextEncoder().encode(password).length;
      if (password.length < 12 || password.length > 72) {
        setPasswordError(t("Mật khẩu phải từ 12 đến 72 ký tự."));
        valid = false;
      } else if (utf8Bytes > 72) {
        setPasswordError(t("Mật khẩu không được vượt quá 72 byte UTF-8."));
        valid = false;
      }
    }

    if (!farmId) {
      setFormError(t("Vui lòng chọn vườn canh tác phụ trách."));
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    setEmailError(null);

    try {
      const created = await createOwner({
        email: email.trim().toLowerCase(),
        initialPassword: password,
        farmId: Number(farmId),
      });

      // Wipe password from state immediately
      setPassword('');
      onSuccess(created);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status === 409) {
        setEmailError(t("Email này đã được gán cho một tài khoản khác trong hệ thống."));
        emailInputRef.current?.focus();
      } else if (error.response?.status === 400) {
        setFormError(error.response?.data?.message || t("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."));
      } else {
        setFormError(t("Không thể tạo tài khoản chủ vườn. Vui lòng thử lại sau."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.length >= 12 && farmId !== '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-owner-dialog-title"
        className="w-full sm:max-w-[520px] h-full sm:h-auto rounded-none sm:rounded-xl bg-surface border-0 sm:border border-border shadow-2xl flex flex-col overflow-hidden max-h-full sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[#1f5ca9]">
              person_add
            </span>
            <h2 id="create-owner-dialog-title" className="text-base font-bold text-text">
              {t("Tạo tài khoản chủ vườn")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t("Đóng")}
            className="p-1 rounded-lg text-gray hover:text-text hover:bg-border/40 transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-4 text-sm flex-1">
            {/* Context Info Banner */}
            <div className="p-3 bg-[#eff4ff] dark:bg-blue-950/40 border border-[#cbdbf5] dark:border-blue-800/60 rounded-lg text-xs text-[#1e40af] dark:text-blue-300 flex items-start gap-2.5 leading-relaxed">
              <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0 mt-0.5">
                info
              </span>
              <span>
                {t("Tài khoản chủ vườn được cấp quyền truy cập để ghi nhật ký canh tác và theo dõi số đo cảm biến theo đúng vườn được phân bổ.")}
              </span>
            </div>

            {/* General form error */}
            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base shrink-0">
                  error
                </span>
                <span>{formError}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="owner-create-email" className="block text-xs font-semibold text-text">
                {t("Email đăng nhập")} <span className="text-red-500">*</span>
              </label>
              <input
                ref={emailInputRef}
                id="owner-create-email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                disabled={isSubmitting}
                placeholder="chuvuon@domain.invalid"
                className={`w-full h-11 px-3.5 rounded-lg border bg-bg text-sm text-text focus:outline-none focus:ring-2 focus:ring-[#1f5ca9]/20 transition-colors ${
                  emailError
                    ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500'
                    : 'border-border focus:border-[#1f5ca9]'
                }`}
              />
              {emailError ? (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    error
                  </span>
                  <span>{emailError}</span>
                </div>
              ) : (
                <p className="text-[11px] text-gray">
                  {t("Sử dụng định dạng email hợp lệ của chủ vườn.")}
                </p>
              )}
            </div>

            {/* Initial Password Field */}
            <div className="space-y-1">
              <label htmlFor="owner-create-password" className="block text-xs font-semibold text-text">
                {t("Mật khẩu ban đầu")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="owner-create-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  disabled={isSubmitting}
                  className={`w-full h-11 pl-3.5 pr-10 rounded-lg border bg-bg text-sm text-text focus:outline-none focus:ring-2 focus:ring-[#1f5ca9]/20 transition-colors ${
                    passwordError
                      ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500'
                      : 'border-border focus:border-[#1f5ca9]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray hover:text-text transition-colors p-1"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordError ? (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    error
                  </span>
                  <span>{passwordError}</span>
                </div>
              ) : (
                <p className="text-[11px] text-gray">
                  {t("12–72 ký tự và tối đa 72 byte UTF-8.")}
                </p>
              )}
            </div>

            {/* Farm Select Field */}
            <div className="space-y-1">
              <label htmlFor="owner-create-farm" className="block text-xs font-semibold text-text">
                {t("Vườn canh tác phụ trách")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="owner-create-farm"
                  required
                  value={farmId}
                  onChange={e => setFarmId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isSubmitting || farmsLoading}
                  className="w-full h-11 pl-3.5 pr-10 rounded-lg border border-border bg-bg text-sm text-text appearance-none focus:outline-none focus:border-[#1f5ca9] focus:ring-2 focus:ring-[#1f5ca9]/20 cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>
                    {farmsLoading ? t("Đang tải danh sách vườn...") : t("Chọn vườn")}
                  </option>
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray"
                >
                  expand_more
                </span>
              </div>
              <p className="text-[11px] text-gray">
                {t("Mỗi tài khoản được liên kết độc quyền với 1 vườn.")}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-6 sm:py-4 bg-[#f8fafc] dark:bg-surface/60 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="order-1 sm:order-2 w-full sm:w-auto h-11 px-5 rounded-lg bg-[#1f5ca9] hover:bg-[#174987] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("Đang tạo...")}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    person_add
                  </span>
                  <span>{t("Tạo tài khoản")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
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
