import { useTranslation } from 'react-i18next';
import type { NivelConfianza } from '@/experiencias/sala/ungrd/types/paquete';
import { estilosConfianza } from '@/experiencias/sala/ungrd/components/estilosConfianza';

interface InsigniaConfianzaProps {
  nivel: NivelConfianza;
}

/**
 * Marca de cuánta confianza merece un dato.
 *
 * Un ministerio tiene que poder separar «12 viviendas destruidas verificadas» de
 * «37 reportes ciudadanos sin verificar», así que este distintivo acompaña a cada
 * daño y nunca se oculta para ganar espacio.
 */
export default function InsigniaConfianza({ nivel }: InsigniaConfianzaProps) {
  const { t } = useTranslation();
  const { icono: Icono, insignia } = estilosConfianza[nivel];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${insignia}`}
      title={t(`paquete.confianzaDetalle.${nivel}`)}
    >
      <Icono className="h-3 w-3 shrink-0" aria-hidden="true" />
      {t(`paquete.confianza.${nivel}`)}
    </span>
  );
}
