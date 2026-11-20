import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  onContinueEditing,
  onDiscardChanges,
}: UnsavedChangesModalProps) {
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        primaryBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onContinueEditing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinueEditing]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative w-full max-w-[460px] bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
            <span className="material-symbols-outlined text-xl">warning</span>
          </div>
          <div>
            <h2 id="unsaved-modal-title" className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
              {t('Bạn có thay đổi chưa lưu')}
            </h2>
            <p className="text-[11px] text-[#64748b] dark:text-slate-400">
              {t('Cấu hình bố trí sơ đồ đã được điều chỉnh cục bộ')}
            </p>
          </div>
        </div>

        <p className="text-xs text-[#64748b] dark:text-slate-300 leading-relaxed">
          {t('Bạn đã thay đổi tọa độ hoặc vị trí các khu vực canh tác trên sơ đồ nhưng chưa lưu xuống máy chủ. Nếu rời khỏi chế độ này, các thay đổi chưa lưu sẽ bị hủy bỏ.')}
        </p>

        {/* Buttons: Primary is Continue Editing; Secondary/Danger is Discard */}
        <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={onContinueEditing}
            className="h-[44px] min-h-[44px] px-5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            <span>{t('Tiếp tục chỉnh sửa')}</span>
          </button>

          <button
            type="button"
            onClick={onDiscardChanges}
            className="h-[44px] min-h-[44px] px-4 rounded-xl border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            <span>{t('Bỏ thay đổi')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
