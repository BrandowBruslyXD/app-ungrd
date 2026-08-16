import { useTranslation } from 'react-i18next';
import { Coins, Layers, MapPin, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DesgloseConfianza } from '@/lib/sectorial';
import { NIVELES_CONFIANZA } from '@/types/sectorial';
import DistintivoConfianza from './DistintivoConfianza';
import { formatearNumero, formatearPesos } from './formato';

interface ResumenPaqueteProps {
  totalDanos: number;
  totalMunicipios: number;
  personasAfectadas: number;
  costoEstimado: number;
  confianza: DesgloseConfianza;
}

interface Indicador {
  etiqueta: string;
  valor: string;
  nota?: string;
  icono: LucideIcon;
  clases: string;
}

/**
 * Las cuatro cifras del paquete y el reparto de confianza que las sostiene.
 *
 * Ninguna está escrita: todas se cuentan sobre los daños del sector. Un
 * encabezado que dijera «18.450 personas» mientras el detalle adjunto suma otra
 * cosa es el error que más caro sale en un documento oficial, y no se ve
 * mirando la pantalla.
 *
 * El reparto de confianza va al lado de las cifras y no debajo de la tabla,
 * porque cambia cómo se leen: dos mil millones de pesos respaldados por un EDAN
 * firmado y dos mil millones salidos de reportes ciudadanos no son la misma
 * información, aunque el número sea idéntico.
 */
export default function ResumenPaquete({
  totalDanos,
  totalMunicipios,
  personasAfectadas,
  costoEstimado,
  confianza,
}: ResumenPaqueteProps) {
  const { t } = useTranslation();

  const indicadores: Indicador[] = [
    {
      etiqueta: t('ungrd.paquete.resumenDanos'),
      valor: formatearNumero(totalDanos),
      icono: Layers,
      clases: 'text-azul-600 bg-azul-50',
    },
    {
      etiqueta: t('ungrd.paquete.resumenMunicipios'),
      valor: formatearNumero(totalMunicipios),
      icono: MapPin,
      clases: 'text-azul-600 bg-azul-50',
    },
    {
      etiqueta: t('ungrd.paquete.resumenPersonas'),
      valor: formatearNumero(personasAfectadas),
      nota: t('ungrd.paquete.resumenPersonasNota'),
      icono: Users,
      clases: 'text-espera-600 bg-espera-50',
    },
    {
      etiqueta: t('ungrd.paquete.resumenCosto'),
      valor: formatearPesos(costoEstimado),
      icono: Coins,
      clases: 'text-seguro-600 bg-seguro-50',
    },
  ];

  const conDatos = NIVELES_CONFIANZA.filter((nivel) => confianza[nivel] > 0);

  return (
    <section aria-labelledby="resumen-paquete">
      <h2 id="resumen-paquete" className="mb-3 text-lg">
        {t('ungrd.paquete.resumenTitulo')}
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(({ etiqueta, valor, nota, icono: Icono, clases }) => (
          <div key={etiqueta} className="ficha min-w-0 p-4">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-control ${clases}`}
            >
              <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-2 text-xl font-bold tabular-nums text-tinta-900">{valor}</p>
            <p className="text-sm leading-snug text-tinta-600">{etiqueta}</p>
            {nota && <p className="mt-1 text-xs leading-snug text-tinta-500">{nota}</p>}
          </div>
        ))}
      </div>

      <div className="ficha mt-3 p-4">
        <h3 className="text-base">{t('ungrd.paquete.confianzaTitulo')}</h3>
        <p className="mt-1 text-sm text-tinta-600">{t('ungrd.paquete.confianzaAyuda')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {conDatos.length === 0 ? (
            <p className="text-sm text-tinta-500">{t('ungrd.paquete.confianzaVacia')}</p>
          ) : (
            conDatos.map((nivel) => (
              <DistintivoConfianza key={nivel} nivel={nivel} conteo={confianza[nivel]} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
