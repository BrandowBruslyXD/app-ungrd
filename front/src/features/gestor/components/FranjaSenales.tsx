import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AlertTriangle } from 'lucide-react';
import { textoFechaImagen } from '@/lib/capasMapa';
import { FUENTE_GDACS, FUENTE_USGS } from '@/lib/observacion';
import type { AlertaMultiamenaza, SismoObservado } from '@/lib/observacion';
import {
  contarPorFuente,
  type SenalGeolocalizada,
} from '@/features/gestor/lib/cruce';
import { observacionMasReciente, tiempoDesde } from '@/features/gestor/lib/tiempoObservacion';

/**
 * Las tres fuentes de observación, cada una diciendo qué vio y cuándo lo vio.
 *
 * Dos reglas gobiernan esta franja:
 *
 * 1. **Nunca «en tiempo real».** Cada ficha dice cuánto hace que se observó, y
 *    la del satélite dice de qué día es la imagen. Un satélite de órbita polar
 *    pasa dos veces al día; fingir inmediatez ante alguien que sabe cómo
 *    funciona es perder la única credibilidad que da mostrar la hora.
 * 2. **La fuente que no responde desaparece.** No hay ficha en gris, ni mensaje
 *    de error, ni hueco. Las otras dos siguen y el gestor no se entera de que
 *    hubo un problema, porque no es su problema.
 */

interface FranjaSenalesProps {
  readonly sismos: readonly SismoObservado[];
  readonly alertas: readonly AlertaMultiamenaza[];
  /** Señales dentro de Colombia que no tienen ningún reporte ciudadano cerca. */
  readonly senalesSinReporte: readonly SenalGeolocalizada[];
  /** Día de la imagen satelital en formato `AAAA-MM-DD`. */
  readonly fechaSatelite: string;
  /** Falso cuando la capa de GIBS no respondió: su ficha se retira. */
  readonly sateliteVivo: boolean;
  /** Mientras las consultas están en curso solo se muestra lo que ya se sabe. */
  readonly cargando: boolean;
}

/** Lo que se pinta en una ficha, ya resuelto en texto. */
interface Ficha {
  readonly clave: string;
  readonly fuente: string;
  readonly hallazgo: string;
  /** Hora de observación ya redactada. Vacía si no se pudo leer. */
  readonly cuando: string;
  /** Cuántas de esas señales no tienen ningún reporte cerca. Cero no se muestra. */
  readonly sinReporte: number;
}

/** «hace 2 h» a partir de una hora ISO, o cadena vacía si no se pudo leer. */
function textoDesde(iso: string | null, t: TFunction): string {
  if (iso === null) {
    return '';
  }

  const relativo = tiempoDesde(iso);
  return relativo === null ? '' : t(relativo.clave, relativo.valores);
}

/**
 * Una fuente en una línea: quién observó, qué vio y cuándo.
 *
 * Antes era una tarjeta con icono en cuadro de color, la descripción
 * institucional de la entidad y una insignia verde de «respondiendo». Nada de
 * eso ayudaba a decidir: quién es el USGS no cambia lo que el gestor hace, y la
 * insignia era información imposible —una fuente que no responde no tiene
 * ficha—. Queda el dato y la hora, que es lo que se mira.
 */
function LineaFuente({ ficha }: { ficha: Ficha }) {
  return (
    <li className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 font-semibold text-tinta-900">{ficha.fuente}</span>
      <span className="min-w-0 text-tinta-700">{ficha.hallazgo}</span>
      {ficha.cuando !== '' && (
        <span className="shrink-0 text-tinta-500">· {ficha.cuando}</span>
      )}
    </li>
  );
}

export default function FranjaSenales({
  sismos,
  alertas,
  senalesSinReporte,
  fechaSatelite,
  sateliteVivo,
  cargando,
}: FranjaSenalesProps) {
  const { t } = useTranslation();
  const idTitulo = useId();

  const fichas: Ficha[] = [];

  /*
   * La imagen satelital no se pide con `fetch` sino con teselas, así que su
   * estado no lo sabe el hook: lo sabe el mapa y lo cuenta hacia arriba. Por eso
   * esta ficha puede aparecer antes que las otras dos.
   */
  if (sateliteVivo) {
    fichas.push({
      clave: 'gibs',
      fuente: t('manager.observacion.gibsFuente'),
      hallazgo: t('manager.observacion.gibsHallazgo', { fecha: textoFechaImagen(fechaSatelite) }),
      cuando: t('manager.observacion.gibsCuando'),
      sinReporte: 0,
    });
  }

  // Lista vacía y fuente caída son indistinguibles por diseño: los clientes
  // convierten cualquier fallo en lista vacía. Entre anunciar «0 sismos» sin
  // saberlo y no decir nada, en una herramienta de emergencias se calla.
  if (!cargando && sismos.length > 0) {
    fichas.push({
      clave: 'usgs',
      fuente: FUENTE_USGS,
      hallazgo: t('manager.observacion.usgsHallazgo', { count: sismos.length }),
      cuando: t('manager.observacion.usgsCuando', {
        tiempo: textoDesde(observacionMasReciente(sismos), t),
      }),
      sinReporte: contarPorFuente(senalesSinReporte, FUENTE_USGS),
    });
  }

  if (!cargando && alertas.length > 0) {
    fichas.push({
      clave: 'gdacs',
      fuente: FUENTE_GDACS,
      hallazgo: t('manager.observacion.gdacsHallazgo', { count: alertas.length }),
      cuando: t('manager.observacion.gdacsCuando', {
        tiempo: textoDesde(observacionMasReciente(alertas), t),
      }),
      sinReporte: contarPorFuente(senalesSinReporte, FUENTE_GDACS),
    });
  }

  if (fichas.length === 0) {
    return null;
  }

  const sinReporte = fichas.reduce((suma, ficha) => suma + ficha.sinReporte, 0);

  return (
    <section className="mt-6" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="sr-only">
        {t('manager.observacion.franjaTitulo')}
      </h2>

      <div className="ficha flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-x-5 gap-y-1.5">
          {fichas.map((ficha) => (
            <LineaFuente key={ficha.clave} ficha={ficha} />
          ))}
        </ul>

        {/*
         * La lectura inversa del cruce, y la única accionable de toda la franja:
         * una señal sin ningún reporte cerca significa que algo pasó donde nadie
         * ha avisado. Por eso va destacada y sumada de todas las fuentes, en vez
         * de repetida dentro de cada tarjeta.
         *
         * El matiz que evita el error grave —que la ausencia de señal NO pone en
         * duda un reporte, porque puede ser de noche, con nubes, o un
         * deslizamiento que estas fuentes no observan— vive en el título del
         * aviso: hace falta al interpretarlo, no ocupando dos líneas siempre.
         */}
        {sinReporte > 0 && (
          <p
            className="flex shrink-0 items-center gap-1.5 font-semibold text-espera-700"
            title={t('manager.observacion.notaAusencia')}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('manager.observacion.sinReporte', { count: sinReporte })}
          </p>
        )}
      </div>
    </section>
  );
}
