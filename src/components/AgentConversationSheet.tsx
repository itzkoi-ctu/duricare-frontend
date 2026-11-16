import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n';

export default function AgentConversationSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();

    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialog}
      aria-label={t('Lịch sử hội thoại')}
      onCancel={onClose}
      onClose={onClose}
      onClick={e => {
        if (e.target === dialog.current) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-[min(90vw,20rem)] max-w-none border-r border-[#e2e8f0] dark:border-border bg-white dark:bg-surface p-0 text-text backdrop:bg-black/50 shadow-2xl"
    >
      <div className="flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between p-3 border-b border-[#e2e8f0] dark:border-border">
          <span className="font-semibold text-sm text-[#0f172a] dark:text-text">{t('Lịch sử hội thoại')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Đóng')}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </dialog>
  );
}
