import { useTranslation } from 'react-i18next';
import type { DesgloseConfianza } from '@/lib/sectorial';
import { NIVELES_CONFIANZA, type NivelConfianza } from '@/types/sectorial';

/**
 * El punto de color de cada nivel, con los tonos validados contra daltonismo
 * (`docs/REPARTO-SECTORIAL.md`): verde, azul y oro.
 *
 * La combinación obvia —verde, amarillo, rojo de semáforo— falla: el rojo y el
 * oro quedan indistinguibles en deuteranopía. Por eso el nivel intermedio es
 * azul. Y el color nunca va solo: al lado siempre está la palabra.
 */
const PUNTO: Record<NivelConfianza, string> = {
  Verificado: 'bg-seguro-600',
  Censado: 'bg-azul-500',
  Autorreportado: 'bg-oro-700',
};

/**
 * Del dato más comprobado al menos, que es como se lee la frase del formato:
 * «8 verificados · 3 censados · 26 autorreportados». `NIVELES_CONFIANZA` va al
 * revés porque describe una escalera que se sube.
 */
const ORDEN: readonly NivelConfianza[] = [...NIVELES_CONFIANZA].reverse();

interface ProporcionConfianzaProps {
  desglose: DesgloseConfianza;
}

/**
 * La confianza de un grupo de daños, **como proporción y nunca como promedio**.
 *
 * Un promedio escondería que la mayor parte del volumen no está verificada, y
 * eso es justo lo que un ministerio necesita saber antes de comprometer
 * presupuesto: no es lo mismo «12 viviendas destruidas, verificadas por el
 * CMGRD» que «37 reportes ciudadanos sin verificar en la zona».
 *
 * Los niveles en cero no se escriben: «0 censados» ocupa sitio y no dice nada.
 */
export default function ProporcionConfianza({ desglose }: ProporcionConfianzaProps) {
  const { t } = useTranslation();
  const presentes = ORDEN.filter((nivel) => desglose[nivel] > 0);

  if (presentes.length === 0) {
    return <span className="text-sm text-tinta-400">{t('ungrd.panel.sinDanos')}</span>;
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {presentes.map((nivel) => (
        <li
          key={nivel}
          className="flex items-center gap-1.5 whitespace-nowrap text-sm text-tinta-700"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${PUNTO[nivel]}`}
            aria-hidden="true"
          />
          <span className="font-semibold tabular-nums">{desglose[nivel]}</span>
          {t(`ungrd.confianzaPlural.${nivel}`)}
        </li>
      ))}
    </ul>
  );
}
