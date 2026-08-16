import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Modal centrado con overlay. Cierra con ESC o clic en el fondo.
// Se renderiza en un PORTAL a document.body: así queda FUERA de cualquier
// ancestro con `transform` (p. ej. la animación de página animate-fade-in-up),
// que rompería el `position: fixed` y descentraría/cortaría el modal.
export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    // Bloquea el scroll de fondo mientras el modal está abierto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {/* max-h + cuerpo scrollable: en pantallas bajas el footer (acciones) nunca queda fuera. */}
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col animate-fade-in-up rounded-2xl border border-slate-200/80 bg-white/95 shadow-lift backdrop-blur-xl">
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200/80 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
