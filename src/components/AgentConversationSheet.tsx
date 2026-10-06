import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n';

export default function AgentConversationSheet({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open, onClose]);
  return <dialog ref={dialog} aria-label={t('Lịch sử hội thoại')} onCancel={onClose} onClose={onClose}
    className="fixed inset-0 m-0 h-dvh max-h-dvh w-[min(90vw,24rem)] max-w-none border-r border-border bg-surface p-0 text-text backdrop:bg-text/40">
    <div className="flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <button type="button" onClick={onClose} className="m-2 ml-auto min-h-11 rounded-lg border border-border px-3 text-xs font-semibold cursor-pointer">{t('Đóng lịch sử')}</button>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  </dialog>;
}
