import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Clock, Inbox, MapPin, Sparkles } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import { CATALOGO_SECTORES, FICHAS_SECTOR } from '@/lib/catalogoSectores';
import { SECTORES, type DanoSectorizado, type Sector } from '@/types/sectorial';
import { formatearFechaHora } from './formatoPanel';

/** El valor del selector: un sector, o vacío mientras el funcionario no elija. */
type Eleccion = Sector | '';

function esSector(valor: string): valor is Sector {
  return (SECTORES as readonly string[]).includes(valor);
}

interface BandejaSinClasificarProps {
  danos: readonly DanoSectorizado[];
  /** Sin backend: el panel guarda la corrección en memoria y recalcula el reparto. */
  onAsignar: (danoId: string, sector: Sector) => void;
}

/**
 * Subpanel C · Sin clasificar: lo único de la pantalla que exige trabajo del
 * funcionario.
 *
 * Va antes de la bitácora a propósito. Mientras haya algo aquí, el reparto está
 * incompleto, y una bandeja visible es preferible a un dato mal enviado: un
 * daño que llega al ministerio equivocado cuesta más que uno que espera.
 */
export default function BandejaSinClasificar({ danos, onAsignar }: BandejaSinClasificarProps) {
  const { t } = useTranslation();

  const [elecciones, setElecciones] = useState<Record<string, Eleccion>>({});
  const [ultimoAsignado, setUltimoAsignado] = useState<string | null>(null);

  function elegir(danoId: string, valor: string): void {
    setElecciones((previas) => ({ ...previas, [danoId]: esSector(valor) ? valor : '' }));
  }

  function asignar(evento: FormEvent<HTMLFormElement>, dano: DanoSectorizado): void {
    evento.preventDefault();
    const elegido = elecciones[dano.id];
    if (elegido === undefined || elegido === '') return;

    onAsignar(dano.id, elegido);
    setElecciones((previas) => ({ ...previas, [dano.id]: '' }));
    setUltimoAsignado(
      t('ungrd.panel.asignadoAviso', {
        municipio: dano.municipio,
        sector: t(CATALOGO_SECTORES[elegido].claveNombre),
      }),
    );
  }

  return (
    <Ficha
      titulo={t('ungrd.panel.bandejaTitulo')}
      icono={Inbox}
      apunte={t('ungrd.panel.bandejaApunte', { total: danos.length })}
      sinRelleno
    >
      <div className="p-4 sm:p-5">
        <p className="text-tinta-600">{t('ungrd.panel.bandejaDescripcion')}</p>

        {/*
          El resultado se anuncia además de verse: el elemento asignado
          desaparece de la lista, y sin este aviso quien navega con lector de
          pantalla solo percibe que algo se fue.
        */}
        {ultimoAsignado !== null && (
          <div role="status" className="aviso-seguro mt-4">
            <CircleCheck className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">{ultimoAsignado}</p>
          </div>
        )}
      </div>

      {danos.length === 0 ? (
        /* La bandeja vacía se muestra, no se esconde: es una buena noticia y
           hay que verla. */
        <div className="flex flex-col items-center gap-3 border-t border-papel-borde px-4 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-seguro-50">
            <CircleCheck className="h-9 w-9 text-seguro-600" aria-hidden="true" />
          </span>
          <p className="text-lg font-bold text-tinta-900">{t('ungrd.panel.bandejaVaciaTitulo')}</p>
          <p className="max-w-md text-tinta-600">{t('ungrd.panel.bandejaVaciaCuerpo')}</p>
        </div>
      ) : (
        <ul className="border-t border-papel-borde">
          {danos.map((dano) => {
            const idSelector = `sector-${dano.id}`;
            const sugeridos = dano.sectoresSugeridos ?? [];
            const elegido = elecciones[dano.id] ?? '';

            return (
              <li key={dano.id} className="border-b border-papel-borde p-4 last:border-b-0 sm:p-5">
                <p className="font-semibold leading-snug text-tinta-900">{dano.descripcion}</p>

                <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-tinta-600">
                  <li className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {dano.municipio}, {dano.departamento}
                  </li>
                  <li>
                    <span className="distintivo bg-tinta-100 text-tinta-700">
                      <span>{t(`ungrd.origen.${dano.origen}`)}</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {formatearFechaHora(dano.registradoEn)}
                  </li>
                </ul>

                {/* La sugerencia del clasificador se muestra marcada como tal y
                    nunca se aplica sola: quien firma el envío es una persona. */}
                {sugeridos.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-tinta-600">
                    <Sparkles className="h-4 w-4 shrink-0 text-espera-600" aria-hidden="true" />
                    <span className="font-semibold">{t('ungrd.panel.sugerenciasEtiqueta')}</span>
                    {sugeridos.map((sector) => t(CATALOGO_SECTORES[sector].claveNombre)).join(' · ')}
                  </p>
                )}

                <form
                  onSubmit={(evento) => asignar(evento, dano)}
                  className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <label htmlFor={idSelector} className="etiqueta">
                      {t('ungrd.panel.asignarEtiqueta')}
                    </label>
                    <select
                      id={idSelector}
                      className="campo"
                      value={elegido}
                      onChange={(evento) => elegir(dano.id, evento.target.value)}
                    >
                      <option value="">{t('ungrd.panel.asignarVacio')}</option>
                      {FICHAS_SECTOR.map((ficha) => (
                        <option key={ficha.sector} value={ficha.sector}>
                          {t(ficha.claveNombre)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn-primary shrink-0" disabled={elegido === ''}>
                    {t('ungrd.panel.asignarAccion')}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </Ficha>
  );
}
