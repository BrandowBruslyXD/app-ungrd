import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, TriangleAlert } from 'lucide-react';

interface DialogoConfirmacionProps {
  titulo: string;
  descripcion: string;
  /** Datos que el funcionario debe releer antes de firmar. */
  children: ReactNode;
  textoConfirmar: string;
  /** Impide cerrar o confirmar dos veces mientras se registra el envío. */
  trabajando: boolean;
  textoTrabajando: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Lo que puede recibir el foco dentro del diálogo. */
const SELECTOR_ENFOCABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Confirmación previa a una acción que no se puede deshacer.
 *
 * Un documento oficial que sale solo es un riesgo institucional: la firma es humana y
 * este paso existe para que nadie la dé por accidente.
 */
export default function DialogoConfirmacion({
  titulo,
  descripcion,
  children,
  textoConfirmar,
  trabajando,
  textoTrabajando,
  onConfirmar,
  onCancelar,
}: DialogoConfirmacionProps) {
  const { t } = useTranslation();
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const origenDelFoco = document.activeElement;
    botonConfirmar.current?.focus();

    return () => {
      // Devolver el foco a donde estaba evita que el teclado quede al principio de la página.
      if (origenDelFoco instanceof HTMLElement && document.contains(origenDelFoco)) {
        origenDelFoco.focus();
      }
    };
  }, []);

  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !trabajando) {
        onCancelar();
        return;
      }
      if (evento.key !== 'Tab') return;

      const contenedor = panel.current;
      if (contenedor === null) return;

      // Sin esto el tabulador se escapa al contenido de fondo, que sigue siendo navegable
      // aunque el diálogo lo tape.
      const enfocables = Array.from(contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE));
      if (enfocables.length === 0) {
        evento.preventDefault();
        contenedor.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;
      const dentroDelDialogo = activo instanceof Node && contenedor.contains(activo);

      if (!dentroDelDialogo) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus();
        return;
      }
      if (evento.shiftKey && activo === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [onCancelar, trabajando]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmacion"
        aria-describedby="descripcion-confirmacion"
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-scale-in focus:outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100">
            <TriangleAlert className="h-5 w-5 text-ungrd-800" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="titulo-confirmacion" className="text-base font-bold text-slate-900">
              {titulo}
            </h2>
            <p id="descripcion-confirmacion" className="mt-1 text-sm text-slate-600">
              {descripcion}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{children}</div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={trabajando}
            className="btn-secondary btn-sm"
          >
            {t('paquete.cancelar')}
          </button>
          <button
            ref={botonConfirmar}
            type="button"
            onClick={onConfirmar}
            disabled={trabajando}
            className="btn-primary btn-sm"
          >
            {trabajando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {trabajando ? textoTrabajando : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
