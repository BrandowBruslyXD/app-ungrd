import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Camera } from 'lucide-react';
import type { TrustLevel } from '@/types';

interface TalonSeguimientoProps {
  codigo: string;
  nivelConfianza: TrustLevel;
  /** Muestra la advertencia de que el código no inscribe en el censo. */
  conAdvertenciaCenso?: boolean;
}

/**
 * El talón de seguimiento: el recibo que el ciudadano se lleva.
 *
 * Es el elemento con más carga del producto. La investigación
 * (`docs/SISTEMA-REPORTES-COLOMBIA.md`, §7.3) encontró que hoy el afectado se
 * queda sin nada que consultar, porque el número de folio del RUD es interno del
 * funcionario. Este código es lo primero que existe para él.
 *
 * Por eso está dibujado como un talón troquelado y no como una tarjeta más: se
 * lee como algo que se arranca y se guarda. El código va en monoespaciada
 * grande y espaciada porque la gente lo va a dictar por teléfono.
 */
export default function TalonSeguimiento({
  codigo,
  nivelConfianza,
  conAdvertenciaCenso = true,
}: TalonSeguimientoProps) {
  const { t } = useTranslation();
  const [copiado, setCopiado] = useState(false);

  // En Android viejo o sobre http la API de portapapeles no existe. Si no está,
  // no se ofrece el botón: mejor eso que un botón que no hace nada.
  const puedeCopiar = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Si el navegador lo bloquea, el código sigue visible para copiarlo a mano.
      setCopiado(false);
    }
  }

  return (
    <div className="sobre-oscuro talon px-5 py-6 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wider text-oro-400">{t('ui.stub.label')}</p>

      <p className="talon-codigo mt-2 break-all">{codigo}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">
          {t(`trust.${nivelConfianza}`)}
        </span>
        {puedeCopiar && (
          <button
            type="button"
            onClick={copiar}
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-control bg-white/15 px-4 text-sm font-bold text-white transition-colors hover:bg-white/25"
          >
            {copiado ? (
              <Check className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Copy className="h-5 w-5" aria-hidden="true" />
            )}
            {copiado ? t('ui.stub.copied') : t('ui.stub.copy')}
          </button>
        )}
      </div>

      {/* Se anuncia aparte para que el lector de pantalla confirme la copia. */}
      <span className="solo-lector" role="status" aria-live="polite">
        {copiado ? t('ui.stub.copied') : ''}
      </span>

      <p className="mt-4 flex items-start gap-2 text-sm leading-snug text-azul-100">
        <Camera className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        {t('ui.stub.hint')}
      </p>

      {conAdvertenciaCenso && (
        <p className="mt-4 border-t border-white/20 pt-4 text-sm font-semibold leading-snug text-oro-300">
          {t('ui.stub.notCensus')}
        </p>
      )}
    </div>
  );
}
