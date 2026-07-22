import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Heart, X } from '@phosphor-icons/react';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  bodyClassName?: string;
}

export default function ResponsiveModal({
  open,
  onClose,
  title,
  description,
  icon = <Heart size={20} weight="fill" aria-hidden="true" />,
  children,
  footer,
  maxWidthClassName = 'sm:max-w-3xl',
  bodyClassName = '',
}: ResponsiveModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 hidden bg-slate-950/30 backdrop-blur-[2px] sm:block"
        aria-label="Đóng cửa sổ"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsive-modal-title"
        className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl ${maxWidthClassName}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-rose-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              {typeof icon === 'string'
                ? <span className="material-symbols-outlined">{icon}</span>
                : icon}
            </div>
            <div className="min-w-0">
              <h2 id="responsive-modal-title" className="font-extrabold text-slate-900">{title}</h2>
              {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
            aria-label="Đóng"
          >
            <X size={19} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
        {footer && <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
