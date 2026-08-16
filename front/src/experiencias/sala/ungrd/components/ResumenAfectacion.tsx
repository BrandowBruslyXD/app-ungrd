import { useTranslation } from 'react-i18next';
import { Coins, Layers, MapPinned } from 'lucide-react';
import type { ResumenPaquete } from '@/experiencias/sala/ungrd/types/paquete';
import { NIVELES_CONFIANZA } from '@/experiencias/sala/ungrd/types/paquete';
import { formatearPesos } from '@/experiencias/sala/ungrd/utils/resumenPaquete';
import { estilosConfianza } from '@/experiencias/sala/ungrd/components/estilosConfianza';

interface ResumenAfectacionProps {
  resumen: ResumenPaquete;
}

/**
 * Lo primero que el funcionario necesita ver: cuánto hay y de qué confianza.
 *
 * Por eso la composición por nivel de confianza va aquí arriba y no escondida en el
 * detalle: es el dato que decide si el paquete se puede enviar tal como está.
 */
export default function ResumenAfectacion({ resumen }: ResumenAfectacionProps) {
  const { t } = useTranslation();

  /**
   * El costo lleva un escalón menos de tamaño: es la única cifra que puede pasar de los diez
   * caracteres («$ 2.070.000.000») y a 30 px se sale de su tarjeta en un portátil de 1280 px.
   */
  const cifras = [
    {
      clave: 'danos',
      icono: Layers,
      valor: String(resumen.totalDanos),
      tamanoValor: 'text-3xl',
      titulo: t('paquete.totalDanos'),
      apoyo: t('paquete.totalDanosApoyo'),
    },
    {
      clave: 'municipios',
      icono: MapPinned,
      valor: String(resumen.totalMunicipios),
      tamanoValor: 'text-3xl',
      titulo: t('paquete.totalMunicipios'),
      apoyo: t('paquete.totalMunicipiosApoyo'),
    },
    {
      clave: 'costo',
      icono: Coins,
      valor: formatearPesos(resumen.costoEstimadoTotal),
      tamanoValor: 'text-xl sm:text-2xl',
      titulo: t('paquete.costoEstimado'),
      apoyo:
        resumen.danosSinCosto > 0
          ? t('paquete.costoEstimadoApoyo', { cantidad: resumen.danosSinCosto })
          : t('paquete.costoEstimadoCompleto'),
    },
  ];

  return (
    <section aria-labelledby="titulo-resumen" className="space-y-4">
      <h2 id="titulo-resumen" className="sr-only">
        {t('paquete.resumenTitulo')}
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {cifras.map(({ clave, icono: Icono, valor, tamanoValor, titulo, apoyo }) => (
          <div key={clave} className="card min-w-0 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Icono className="h-4 w-4 shrink-0 text-ungrd-600" aria-hidden="true" />
              {titulo}
            </div>
            <p className={`mt-2 font-bold tabular-nums text-slate-900 ${tamanoValor}`}>{valor}</p>
            <p className="mt-1 text-sm text-slate-600">{apoyo}</p>
          </div>
        ))}
      </div>

      {/* A lo ancho: la composición por confianza es lo que decide si el paquete puede salir
          tal como está, y cada nivel necesita espacio para explicarse sin recortarse. */}
      <div className="card-pad">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {t('paquete.composicionConfianza')}
        </p>

        <div
          className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100"
          aria-hidden="true"
        >
          {NIVELES_CONFIANZA.map((nivel) => {
            const cantidad = resumen.porConfianza[nivel];
            if (cantidad === 0) return null;
            const porcentaje = (cantidad / resumen.totalDanos) * 100;
            return (
              <span
                key={nivel}
                className={estilosConfianza[nivel].barra}
                style={{ width: `${porcentaje}%` }}
              />
            );
          })}
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {NIVELES_CONFIANZA.map((nivel) => (
            <li key={nivel} className="flex min-w-0 gap-2.5">
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${estilosConfianza[nivel].barra}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-base text-slate-800">
                  <span className="font-bold tabular-nums">{resumen.porConfianza[nivel]}</span>{' '}
                  <span className="font-semibold">{t(`paquete.confianza.${nivel}`)}</span>
                </p>
                <p className="text-sm text-slate-600">{t(`paquete.confianzaDetalle.${nivel}`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
