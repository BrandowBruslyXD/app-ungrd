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

  useEffect(() => {
    botonConfirmar.current?.focus();
  }, []);

  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !trabajando) onCancelar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [onCancelar, trabajando]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmacion"
        aria-describedby="descripcion-confirmacion"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-scale-in"
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
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {t('paquete.cancelar')}
          </button>
          <button
            ref={botonConfirmar}
            type="button"
            onClick={onConfirmar}
            disabled={trabajando}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ungrd-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ungrd-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {trabajando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {trabajando ? textoTrabajando : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
