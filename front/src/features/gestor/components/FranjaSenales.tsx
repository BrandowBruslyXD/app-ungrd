import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Activity, AlertTriangle, Clock, Globe2, Satellite } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  readonly icono: LucideIcon;
  /** Clases del recuadro del icono. El oro nunca como color de texto sobre blanco. */
  readonly clasesIcono: string;
  readonly fuente: string;
  readonly queEs: string;
  readonly hallazgo: string;
  /** Hora de observación ya redactada. Vacía si no se pudo leer. */
  readonly cuando: string;
  readonly estado: string;
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

function TarjetaFuente({ ficha }: { ficha: Ficha }) {
  const { t } = useTranslation();
  const Icono = ficha.icono;

  return (
    <article className="ficha flex min-w-0 flex-col p-4">
      <header className="flex min-w-0 items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${ficha.clasesIcono}`}
        >
          <Icono className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-tinta-900">{ficha.fuente}</p>
          <p className="text-sm leading-snug text-tinta-600">{ficha.queEs}</p>
        </div>
        <span className="distintivo shrink-0 bg-seguro-50 text-seguro-700">
          <span>{ficha.estado}</span>
        </span>
      </header>

      <p className="mt-3 font-semibold leading-snug text-tinta-900">{ficha.hallazgo}</p>

      {ficha.cuando !== '' && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-tinta-600">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {ficha.cuando}
        </p>
      )}

      {/*
       * La lectura inversa del cruce, y la que de verdad sirve: una señal sin
       * ningún reporte cerca significa que algo pasó donde nadie ha reportado.
       * Va a la vista, no escondida en un detalle plegado.
       */}
      {ficha.sinReporte > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-control border border-espera-200 bg-espera-50 p-2.5 text-sm font-semibold leading-snug text-espera-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('manager.observacion.sinReporte', { count: ficha.sinReporte })}</span>
        </p>
      )}
    </article>
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
      icono: Satellite,
      clasesIcono: 'bg-azul-50 text-azul-700',
      fuente: t('manager.observacion.gibsFuente'),
      queEs: t('manager.observacion.gibsQueEs'),
      hallazgo: t('manager.observacion.gibsHallazgo', { fecha: textoFechaImagen(fechaSatelite) }),
      cuando: t('manager.observacion.gibsCuando'),
      estado: t('manager.observacion.estadoRespondiendo'),
      sinReporte: 0,
    });
  }

  // Lista vacía y fuente caída son indistinguibles por diseño: los clientes
  // convierten cualquier fallo en lista vacía. Entre anunciar «0 sismos» sin
  // saberlo y no decir nada, en una herramienta de emergencias se calla.
  if (!cargando && sismos.length > 0) {
    fichas.push({
      clave: 'usgs',
      icono: Activity,
      clasesIcono: 'bg-espera-50 text-espera-700',
      fuente: FUENTE_USGS,
      queEs: t('manager.observacion.usgsQueEs'),
      hallazgo: t('manager.observacion.usgsHallazgo', { count: sismos.length }),
      cuando: t('manager.observacion.usgsCuando', {
        tiempo: textoDesde(observacionMasReciente(sismos), t),
      }),
      estado: t('manager.observacion.estadoRespondiendo'),
      sinReporte: contarPorFuente(senalesSinReporte, FUENTE_USGS),
    });
  }

  if (!cargando && alertas.length > 0) {
    fichas.push({
      clave: 'gdacs',
      icono: Globe2,
      clasesIcono: 'bg-alerta-50 text-alerta-700',
      fuente: FUENTE_GDACS,
      queEs: t('manager.observacion.gdacsQueEs'),
      hallazgo: t('manager.observacion.gdacsHallazgo', { count: alertas.length }),
      cuando: t('manager.observacion.gdacsCuando', {
        tiempo: textoDesde(observacionMasReciente(alertas), t),
      }),
      estado: t('manager.observacion.estadoRespondiendo'),
      sinReporte: contarPorFuente(senalesSinReporte, FUENTE_GDACS),
    });
  }

  if (fichas.length === 0) {
    return null;
  }

  return (
    <section className="mt-6" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="mb-3 text-lg">
        {t('manager.observacion.franjaTitulo')}
      </h2>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {fichas.map((ficha) => (
          <TarjetaFuente key={ficha.clave} ficha={ficha} />
        ))}
      </div>

      {/*
       * La advertencia que evita el error grave: que una fuente externa no vea
       * nada cerca de un reporte **no lo pone en duda**. Puede ser de noche, con
       * nubes, o un deslizamiento de vereda que ningún satélite de este tipo
       * observa. Se escribe para que nadie saque esa conclusión por su cuenta.
       */}
      <p className="mt-3 text-sm leading-snug text-tinta-600">
        {t('manager.observacion.notaAusencia')}
      </p>
    </section>
  );
}
