import { useTranslation } from 'react-i18next';
import { ClipboardCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NivelConfianza } from '@/types/sectorial';
import { formatearNumero } from './formato';

/*
 * Aquí no se reutiliza `EscaleraConfianza`, y conviene dejar escrito por qué
 * para que nadie lo intente otra vez.
 *
 * Ese componente pinta los cuatro peldaños de `TrustLevel` —la escalera del
 * ciudadano: autorreportado, verificado, censado, avalado— en una lista
 * vertical. Aquí el enumerado es otro: `NivelConfianza`, las tres fuentes del
 * consolidado, donde **`Verificado` es el nivel más alto** porque lo firmó el
 * CMGRD. Encajar uno en el otro obligaría a mostrar el dato más confiable del
 * reparto en el peldaño 2 de 4: el ministerio leería lo contrario de lo que el
 * dato dice. Y una lista de cuatro renglones no cabe en una celda de tabla.
 *
 * Los colores son los tres validados en `docs/REPARTO-SECTORIAL.md` contra
 * contraste y daltonismo. Ninguno va solo: cada uno lleva su icono y su
 * palabra.
 */
const CONFIG: Record<NivelConfianza, { icono: LucideIcon; clases: string }> = {
  Verificado: { icono: ShieldCheck, clases: 'bg-seguro-50 text-seguro-700' },
  Censado: { icono: ClipboardCheck, clases: 'bg-azul-50 text-azul-700' },
  Autorreportado: { icono: ShieldAlert, clases: 'bg-oro-50 text-oro-800' },
};

interface DistintivoConfianzaProps {
  nivel: NivelConfianza;
  /**
   * Cuántos daños hay de este nivel.
   *
   * Se muestra como proporción y nunca como promedio: «26 autorreportados»
   * junto a «8 verificados» dice que el grueso del volumen está sin comprobar,
   * y un promedio lo escondería detrás de una cifra intermedia que no describe
   * a ningún dato real.
   */
  conteo?: number;
}

/** Distintivo del nivel de confianza de un daño del reparto sectorial. */
export default function DistintivoConfianza({ nivel, conteo }: DistintivoConfianzaProps) {
  const { t } = useTranslation();
  const { icono: Icono, clases } = CONFIG[nivel];

  return (
    <span className={`distintivo ${clases}`}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {conteo !== undefined && (
        <span className="font-mono tabular-nums">{formatearNumero(conteo)}</span>
      )}
      <span>{t(`ungrd.confianza.${nivel}`)}</span>
    </span>
  );
}
