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

  const cifras = [
    {
      clave: 'danos',
      icono: Layers,
      valor: String(resumen.totalDanos),
      titulo: t('paquete.totalDanos'),
      apoyo: t('paquete.totalDanosApoyo'),
    },
    {
      clave: 'municipios',
      icono: MapPinned,
      valor: String(resumen.totalMunicipios),
      titulo: t('paquete.totalMunicipios'),
      apoyo: t('paquete.totalMunicipiosApoyo'),
    },
    {
      clave: 'costo',
      icono: Coins,
      valor: formatearPesos(resumen.costoEstimadoTotal),
      titulo: t('paquete.costoEstimado'),
      apoyo:
        resumen.danosSinCosto > 0
          ? t('paquete.costoEstimadoApoyo', { cantidad: resumen.danosSinCosto })
          : t('paquete.costoEstimadoCompleto'),
    },
  ];

  return (
    <section aria-labelledby="titulo-resumen" className="grid gap-4 lg:grid-cols-5">
      <h2 id="titulo-resumen" className="sr-only">
        {t('paquete.resumenTitulo')}
      </h2>

      {cifras.map(({ clave, icono: Icono, valor, titulo, apoyo }) => (
        <div key={clave} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Icono className="h-4 w-4 text-ungrd-500" aria-hidden="true" />
            {titulo}
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{valor}</p>
          <p className="mt-1 text-xs text-slate-500">{apoyo}</p>
        </div>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
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

        <ul className="mt-3 space-y-1.5">
          {NIVELES_CONFIANZA.map((nivel) => (
            <li key={nivel} className="flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${estilosConfianza[nivel].barra}`}
                aria-hidden="true"
              />
              <span className="font-semibold tabular-nums text-slate-800">
                {resumen.porConfianza[nivel]}
              </span>
              <span className="text-slate-600">{t(`paquete.confianza.${nivel}`)}</span>
              <span className="truncate text-xs text-slate-400">
                {t(`paquete.confianzaDetalle.${nivel}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
