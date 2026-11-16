import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../../i18n';

export default function AgentIoTContextSheet({
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

    const desktop = window.matchMedia('(min-width: 1280px)');
    const closeOnDesktop = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialog}
      aria-label={t('Ngữ cảnh trạm đo')}
      onCancel={onClose}
      onClick={e => {
        if (e.target === dialog.current) onClose();
      }}
      className="fixed inset-0 m-0 ml-auto h-dvh max-h-dvh w-[min(92vw,22rem)] max-w-none border-l border-[#e2e8f0] dark:border-border bg-[#f8f9ff] dark:bg-bg p-0 text-text backdrop:bg-black/50 shadow-2xl"
    >
      <div className="flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </dialog>
  );
}
