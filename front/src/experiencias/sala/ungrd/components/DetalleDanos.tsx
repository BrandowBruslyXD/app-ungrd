import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DanoSectorizado, NivelConfianza } from '@/experiencias/sala/ungrd/types/paquete';
import { NIVELES_CONFIANZA } from '@/experiencias/sala/ungrd/types/paquete';
import { formatearFecha, formatearPesos } from '@/experiencias/sala/ungrd/utils/resumenPaquete';
import InsigniaConfianza from '@/experiencias/sala/ungrd/components/InsigniaConfianza';

/** `todos` es la vista sin filtrar; el resto son los tres niveles de confianza. */
type FiltroConfianza = NivelConfianza | 'todos';

interface DetalleDanosProps {
  danos: readonly DanoSectorizado[];
  porConfianza: Record<NivelConfianza, number>;
}

/**
 * Detalle línea a línea de los daños del sector.
 *
 * Cada fila lleva su nivel de confianza y la traza hasta el dato original: sin eso,
 * el ministerio no puede separar lo verificado de lo que apenas es un aviso ciudadano.
 */
export default function DetalleDanos({ danos, porConfianza }: DetalleDanosProps) {
  const { t } = useTranslation();
  const [filtro, setFiltro] = useState<FiltroConfianza>('todos');

  const visibles = useMemo(
    () => (filtro === 'todos' ? [...danos] : danos.filter((dano) => dano.nivelConfianza === filtro)),
    [danos, filtro],
  );

  const opciones: { valor: FiltroConfianza; etiqueta: string; cantidad: number }[] = [
    { valor: 'todos', etiqueta: t('paquete.filtroTodos'), cantidad: danos.length },
    ...NIVELES_CONFIANZA.map((nivel) => ({
      valor: nivel as FiltroConfianza,
      etiqueta: t(`paquete.confianza.${nivel}`),
      cantidad: porConfianza[nivel],
    })),
  ];

  return (
    <section
      aria-labelledby="titulo-danos"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div>
          <h2 id="titulo-danos" className="text-sm font-bold text-slate-800">
            {t('paquete.danosTitulo')}
          </h2>
          <p className="text-xs text-slate-500">{t('paquete.danosApoyo')}</p>
        </div>

        <div
          role="group"
          aria-label={t('paquete.filtroConfianza')}
          className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
        >
          {opciones.map(({ valor, etiqueta, cantidad }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
              disabled={cantidad === 0}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                filtro === valor
                  ? 'bg-white text-ungrd-700 shadow-sm'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-800'
              }`}
            >
              {etiqueta}
              <span className="ml-1.5 tabular-nums text-slate-400">{cantidad}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-2.5 font-semibold">
                {t('paquete.colMunicipio')}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t('paquete.colDano')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                {t('paquete.colCantidad')}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t('paquete.colNivel')}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t('paquete.colConfianza')}
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                {t('paquete.colCosto')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibles.map((dano) => (
              <tr key={dano.id} className="align-top hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <span className="font-semibold text-slate-800">{dano.municipio}</span>
                  <span className="block text-xs text-slate-500">{formatearFecha(dano.fecha)}</span>
                </td>
                <td className="max-w-md px-3 py-3 text-slate-700">
                  {dano.descripcion}
                  <span className="mt-1 block font-mono text-xs text-slate-400">
                    {t(`paquete.origen.${dano.origen}`)} · {dano.origenCodigo}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">
                  {dano.cantidad}
                  <span className="block text-xs text-slate-500">{dano.unidad}</span>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {dano.nivel ? t(`paquete.nivelDano.${dano.nivel}`) : t('paquete.sinNivel')}
                </td>
                <td className="px-3 py-3">
                  <InsigniaConfianza nivel={dano.nivelConfianza} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-semibold text-slate-800">
                  {dano.costoEstimado === null
                    ? t('paquete.sinCosto')
                    : formatearPesos(dano.costoEstimado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibles.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-slate-500">{t('paquete.danosVacio')}</p>
      )}
    </section>
  );
}
