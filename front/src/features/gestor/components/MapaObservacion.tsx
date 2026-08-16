import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CAPA_DE_RESPALDO,
  CAPA_INICIAL_LECTURA,
  ESPERA_MAXIMA_SATELITE_MS,
  TESELA_TRANSPARENTE,
  construirCapasBase,
  textoFechaImagen,
  type ClaveCapaBase,
} from '@/lib/capasMapa';
import { RECUADRO_COLOMBIA, dentroDe } from '@/lib/observacion';
import type { AlertaMultiamenaza, NivelAlerta, SismoObservado } from '@/lib/observacion';
import { tiempoDesde } from '@/features/gestor/lib/tiempoObservacion';

/**
 * El mapa del panel del gestor: una imagen satelital con tres capas de datos encima.
 *
 * **Por qué no reutiliza `MapaUbicacion`.** Ese componente es el selector de
 * punto del ciudadano: existe para que alguien marque dónde se le inundó la
 * casa. Este es de solo lectura y su trabajo es superponer tres geometrías
 * distintas —chinchetas, círculos y rombos— con sus globos y su leyenda. Meter
 * las dos cosas en un componente obligaría al selector a cargar código de capas
 * que nunca usa y pondría el flujo del ciudadano a merced de cada cambio del
 * panel. La regla del proyecto lo dice sin rodeos: duplicar está permitido,
 * abstraer antes de tiempo no, y la tercera repetición —no la segunda— es la que
 * justifica extraer. Lo que sí se comparte de verdad, la configuración de las
 * capas base, ya vive en `@/lib/capasMapa` y de ahí sale.
 */

/** Color de la chincheta de un reporte, según la prioridad del contrato. */
export type TonoReporte = 'alta' | 'media' | 'baja';

/** Un reporte ciudadano listo para pintarse en el mapa. */
export interface MarcadorReporte {
  readonly id: string;
  readonly latitud: number;
  readonly longitud: number;
  readonly titulo: string;
  readonly detalle: string;
  readonly tono: TonoReporte;
  /**
   * Nombres de las fuentes independientes que observaron algo cerca.
   *
   * Que venga vacío **no significa que el reporte sea dudoso**: puede ser de
   * noche, con nubes, o de un tipo de evento que ninguna de estas fuentes
   * observa. Aquí solo se suma confianza; nunca se resta.
   */
  readonly corroboradoPor: readonly string[];
}

interface MapaObservacionProps {
  readonly reportes: readonly MarcadorReporte[];
  readonly sismos: readonly SismoObservado[];
  readonly alertas: readonly AlertaMultiamenaza[];
  /** Día de la imagen satelital en formato `AAAA-MM-DD`, el mismo que ve la franja. */
  readonly fechaSatelite: string;
  /** Aviso de que la imagen satelital no respondió, para que la franja retire su ficha. */
  readonly onSateliteCaido?: () => void;
  readonly alto?: string;
}

/** Teselas fallidas seguidas que se toleran antes de dar la capa por caída. */
const FALLOS_PARA_DESCARTAR_SATELITE = 4;

/** Bogotá: centro de partida mientras no haya nada que encuadrar. */
const CENTRO_COLOMBIA: L.LatLngTuple = [4.711, -74.0721];

/** Zoom de partida: Colombia entera cabe en la pantalla de un portátil. */
const ZOOM_INICIAL = 6;

const RELLENO_REPORTE: Readonly<Record<TonoReporte, string>> = {
  alta: '#ce1126', // alerta-600, el rojo de la bandera
  media: '#b35009', // espera-600
  baja: '#117a50', // seguro-600
};

const RELLENO_ALERTA: Readonly<Record<NivelAlerta, string>> = {
  rojo: '#ce1126',
  naranja: '#b35009',
  verde: '#117a50',
};

/** Azul de marca para los sismos: no compite con la semántica de prioridad. */
const TRAZO_SISMO = '#082e72';
const RELLENO_SISMO = '#1f55be';

/**
 * Escapa lo que viene de afuera antes de meterlo en el HTML de un globo.
 *
 * El título de un reporte lo escribió un ciudadano y el lugar de un sismo lo
 * publica USGS. Los globos de Leaflet se arman con HTML, así que sin esto un
 * `<script>` en cualquiera de los dos campos se ejecutaría.
 */
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => `&#${caracter.charCodeAt(0)};`);
}

/** Chincheta del reporte. En SVG y no en PNG: la ruta relativa de Leaflet se rompe al empaquetar. */
function iconoReporte(tono: TonoReporte, corroborado: boolean): L.DivIcon {
  // El anillo blanco y el punto azul marcan a simple vista qué reportes tienen
  // una segunda fuente detrás. Va acompañado de texto en el globo y de una
  // entrada en la leyenda: el color nunca es el único portador del significado.
  const sello = corroborado
    ? '<circle cx="27" cy="9" r="8" fill="#ffffff"/><circle cx="27" cy="9" r="5.5" fill="#0a3a8f"/>'
    : '';

  return L.divIcon({
    className: '',
    html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12.2 15.2 27.5 15.8 28.2a1.6 1.6 0 0 0 2.4 0C18.8 44.5 34 29.2 34 17 34 7.6 26.4 0 17 0z" fill="${RELLENO_REPORTE[tono]}"/>
      <circle cx="17" cy="17" r="6.5" fill="#ffffff"/>
      ${sello}
    </svg>`,
    iconSize: [36, 46],
    iconAnchor: [17, 46],
  });
}

/** Rombo con signo de admiración para las alertas de GDACS. */
function iconoAlerta(nivel: NivelAlerta): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15 1 29 15 15 29 1 15z" fill="${RELLENO_ALERTA[nivel]}" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M15 8v8" stroke="#ffffff" stroke-width="2.75" stroke-linecap="round"/>
      <circle cx="15" cy="21" r="1.75" fill="#ffffff"/>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/**
 * Radio en píxeles del círculo de un sismo.
 *
 * Proporcional a la magnitud y no a la energía: la escala es logarítmica y un
 * círculo de área proporcional a la energía haría que un magnitud 7 tapase media
 * Colombia mientras un magnitud 3 sería invisible.
 */
function radioSismo(magnitud: number): number {
  return 5 + Math.max(0, magnitud - 2) * 3;
}

/** Formatea la magnitud con una decimal y coma decimal, como se escribe en español. */
function textoMagnitud(magnitud: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(magnitud);
}

/** Línea «Observado hace 2 h», o cadena vacía si la hora no se pudo leer. */
function lineaObservacion(iso: string, t: TFunction): string {
  const relativo = tiempoDesde(iso);
  if (relativo === null) {
    return '';
  }

  return `<br>${t('manager.observacion.popupObservado', {
    tiempo: t(relativo.clave, relativo.valores),
  })}`;
}

/** Enlace a la ficha del evento en la fuente, para que el gestor contraste. */
function enlaceFuente(url: string, fuente: string, t: TFunction): string {
  if (url === '') {
    return '';
  }

  return `<br><a href="${escapar(url)}" target="_blank" rel="noopener noreferrer">${t(
    'manager.observacion.verEnFuente',
    { fuente },
  )}</a>`;
}

export default function MapaObservacion({
  reportes,
  sismos,
  alertas,
  fechaSatelite,
  onSateliteCaido,
  alto = 'h-[26rem] lg:h-[34rem]',
}: MapaObservacionProps) {
  const { t } = useTranslation();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const avisarCaida = useRef(onSateliteCaido);

  const [sateliteCaido, setSateliteCaido] = useState(false);
  const [capaActiva, setCapaActiva] = useState<ClaveCapaBase>(CAPA_INICIAL_LECTURA);

  const capas = useMemo(() => construirCapasBase(fechaSatelite), [fechaSatelite]);
  const capasOfrecidas = useMemo(
    () => capas.filter((capa) => capa.clave !== 'satelite' || !sateliteCaido),
    [capas, sateliteCaido],
  );

  avisarCaida.current = onSateliteCaido;

  useEffect(() => {
    if (!contenedor.current || mapa.current) {
      return;
    }

    const instancia = L.map(contenedor.current, {
      center: CENTRO_COLOMBIA,
      zoom: ZOOM_INICIAL,
      // Desplazarse por el panel con la rueda no debe acercar el mapa sin querer.
      scrollWheelZoom: false,
    });

    mapa.current = instancia;

    return () => {
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  /*
   * Monta la capa base y la reemplaza al conmutar.
   *
   * GIBS es un servicio ajeno y aquí manda la regla del proyecto: si en cinco
   * segundos no llega ni una tesela, o si fallan cuatro seguidas sin que llegue
   * ninguna buena, la opción satelital desaparece del conmutador, el mapa se
   * queda en calles y la franja retira la ficha de NASA. Sin mensaje de error,
   * sin hueco y sin perder los marcadores, que viven en su propio efecto.
   */
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) {
      return;
    }

    const definicion = capas.find((capa) => capa.clave === capaActiva) ?? capas[capas.length - 1];

    const capa = L.tileLayer(definicion.plantillaUrl, {
      attribution: definicion.atribucion,
      maxZoom: definicion.maxZoom,
      maxNativeZoom: definicion.maxNativeZoom,
      subdomains: definicion.subdominios ?? 'abc',
      errorTileUrl: TESELA_TRANSPARENTE,
    }).addTo(instancia);

    if (definicion.clave !== 'satelite') {
      return () => {
        capa.remove();
      };
    }

    let respondio = false;
    let fallos = 0;
    let reloj: number | undefined;

    const detenerReloj = (): void => {
      if (reloj !== undefined) {
        window.clearTimeout(reloj);
        reloj = undefined;
      }
    };

    const descartarSatelite = (): void => {
      setSateliteCaido(true);
      setCapaActiva(CAPA_DE_RESPALDO);
      avisarCaida.current?.();
    };

    // El reloj arranca cuando Leaflet empieza a pedir teselas, no al montar: un
    // contenedor todavía sin tamaño no pide nada y descartar la capa por eso
    // sería castigarla por un problema nuestro.
    const alEmpezarACargar = (): void => {
      if (respondio || reloj !== undefined) {
        return;
      }
      reloj = window.setTimeout(() => {
        if (!respondio) {
          descartarSatelite();
        }
      }, ESPERA_MAXIMA_SATELITE_MS);
    };

    const alCargarTesela = (): void => {
      respondio = true;
      detenerReloj();
    };

    const alFallarTesela = (): void => {
      fallos += 1;
      if (!respondio && fallos >= FALLOS_PARA_DESCARTAR_SATELITE) {
        descartarSatelite();
      }
    };

    capa.on('loading', alEmpezarACargar);
    capa.on('tileload', alCargarTesela);
    capa.on('tileerror', alFallarTesela);

    return () => {
      detenerReloj();
      capa.off('loading', alEmpezarACargar);
      capa.off('tileload', alCargarTesela);
      capa.off('tileerror', alFallarTesela);
      capa.remove();
    };
  }, [capaActiva, capas]);

  /*
   * Las tres capas de datos, en un solo efecto y en este orden.
   *
   * El orden importa: los círculos de los sismos van al fondo porque son los más
   * grandes, y las chinchetas de los reportes al frente porque son lo que el
   * gestor va a tocar. Así una alerta de GDACS no queda debajo de un círculo de
   * cien píxeles y el reporte ciudadano siempre es alcanzable.
   */
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) {
      return;
    }

    const capa = L.layerGroup().addTo(instancia);

    for (const sismo of sismos) {
      L.circleMarker([sismo.latitud, sismo.longitud], {
        radius: radioSismo(sismo.magnitud),
        color: TRAZO_SISMO,
        weight: 2,
        fillColor: RELLENO_SISMO,
        fillOpacity: 0.35,
      })
        .bindPopup(
          `<strong>${t('manager.observacion.popupSismo', {
            magnitud: textoMagnitud(sismo.magnitud),
          })}</strong><br>${t('manager.observacion.popupProfundidad', {
            km: Math.round(sismo.profundidadKm),
            categoria: t(`manager.observacion.profundidad.${sismo.categoriaProfundidad}`),
          })}${sismo.lugar === '' ? '' : `<br>${escapar(sismo.lugar)}`}` +
            lineaObservacion(sismo.observadoEn, t) +
            enlaceFuente(sismo.url, sismo.fuente, t),
        )
        .addTo(capa);
    }

    for (const alerta of alertas) {
      L.marker([alerta.latitud, alerta.longitud], {
        icon: iconoAlerta(alerta.nivel),
        title: alerta.titulo,
        alt: alerta.titulo,
      })
        .bindPopup(
          `<strong>${t('manager.observacion.popupAlerta', {
            amenaza: t(`manager.observacion.amenaza.${alerta.tipo}`),
            nivel: t(`manager.observacion.nivel.${alerta.nivel}`),
          })}</strong>${alerta.titulo === '' ? '' : `<br>${escapar(alerta.titulo)}`}${
            alerta.severidad === null ? '' : `<br>${escapar(alerta.severidad)}`
          }` +
            lineaObservacion(alerta.observadoEn, t) +
            enlaceFuente(alerta.url, alerta.fuente, t),
        )
        .addTo(capa);
    }

    for (const reporte of reportes) {
      const corroborado = reporte.corroboradoPor.length > 0;

      L.marker([reporte.latitud, reporte.longitud], {
        icon: iconoReporte(reporte.tono, corroborado),
        title: reporte.titulo,
        alt: reporte.titulo,
      })
        .bindPopup(
          `<strong>${escapar(reporte.titulo)}</strong>${
            reporte.detalle === '' ? '' : `<br>${escapar(reporte.detalle)}`
          }${
            corroborado
              ? `<br><strong>${t('manager.observacion.popupCorroborado', {
                  fuentes: reporte.corroboradoPor.join(' · '),
                })}</strong>`
              : ''
          }`,
        )
        .addTo(capa);
    }

    /*
     * Encuadre: los reportes, más las señales que caen dentro de Colombia.
     *
     * Las señales del entorno —un sismo en Ecuador o en el Pacífico abierto— se
     * pintan pero no arrastran el encuadre: incluirlas alejaría el mapa hasta
     * que el municipio del gestor fuese un píxel.
     */
    const puntos: L.LatLngTuple[] = [
      ...reportes.map((reporte): L.LatLngTuple => [reporte.latitud, reporte.longitud]),
      ...sismos
        .filter((sismo) => dentroDe(RECUADRO_COLOMBIA, sismo.latitud, sismo.longitud))
        .map((sismo): L.LatLngTuple => [sismo.latitud, sismo.longitud]),
      ...alertas
        .filter((alerta) => dentroDe(RECUADRO_COLOMBIA, alerta.latitud, alerta.longitud))
        .map((alerta): L.LatLngTuple => [alerta.latitud, alerta.longitud]),
    ];

    if (puntos.length > 0) {
      instancia.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 11 });
    }

    return () => {
      capa.remove();
    };
  }, [reportes, sismos, alertas, t]);

  const pieDeCapa =
    capaActiva === 'satelite'
      ? t('mapa.capas.pieSatelite', { fecha: textoFechaImagen(fechaSatelite) })
      : t(`mapa.capas.pie${capaActiva === 'relieve' ? 'Relieve' : 'Calles'}`);

  return (
    <div>
      <div className="relative">
        <div
          ref={contenedor}
          className={`w-full overflow-hidden rounded-t-ficha border-b border-papel-borde ${alto}`}
          role="img"
          aria-label={t('manager.observacion.etiquetaMapa')}
        />

        {capasOfrecidas.length > 1 && (
          /*
           * Conmutador propio y fuera del contenedor de Leaflet. El control de
           * capas que trae Leaflet es un menú de radios de 14 px: no llega al
           * área tocable mínima ni hereda la paleta.
           */
          <div
            role="group"
            aria-label={t('mapa.capas.grupo')}
            className="absolute right-2 top-2 z-[500] flex gap-1 rounded-control border border-papel-borde bg-white/95 p-1 shadow-ficha"
          >
            {capasOfrecidas.map((capa) => {
              const activa = capa.clave === capaActiva;
              return (
                <button
                  key={capa.clave}
                  type="button"
                  onClick={() => setCapaActiva(capa.clave)}
                  aria-pressed={activa}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[0.5rem] px-3 text-sm font-bold transition-colors duration-150 ${
                    activa
                      ? 'bg-azul-600 text-white'
                      : 'text-azul-700 hover:bg-azul-50 active:bg-azul-100'
                  }`}
                >
                  {t(capa.claveEtiqueta)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Leyenda ────────────────────────────────────────────────────────
          Tres geometrías distintas sobre la misma imagen no se entienden solas.
          Va debajo del mapa y no encima para no tapar el territorio. */}
      <div className="bg-papel-hueco p-3">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-tinta-600">
              {t('manager.observacion.leyendaReportes')}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {(['alta', 'media', 'baja'] as const).map((tono) => (
                <li key={tono} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: RELLENO_REPORTE[tono] }}
                    aria-hidden="true"
                  />
                  {t(`manager.observacion.leyendaPrioridad.${tono}`)}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-azul-600 ring-1 ring-azul-600"
                  aria-hidden="true"
                />
                {t('manager.observacion.leyendaCorroborado')}
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-tinta-600">
              {t('manager.observacion.leyendaSenales')}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              <li className="flex items-center gap-1.5">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
                  style={{ borderColor: TRAZO_SISMO, backgroundColor: `${RELLENO_SISMO}59` }}
                  aria-hidden="true"
                />
                {t('manager.observacion.leyendaSismo')}
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 shrink-0 rotate-45 bg-alerta-600"
                  aria-hidden="true"
                />
                {t('manager.observacion.leyendaAlerta')}
              </li>
            </ul>
          </div>
        </div>

        {/*
         * La honestidad del dato, escrita donde se toma la decisión: lo que se ve
         * es la última pasada completa del satélite, no «tiempo real».
         */}
        <p className="mt-3 border-t border-papel-borde pt-3 text-sm text-tinta-600">
          <span className="font-semibold text-tinta-800">{pieDeCapa}</span>
          {capaActiva === 'satelite' && ` ${t('mapa.capas.avisoSatelite')}`}
        </p>
      </div>
    </div>
  );
}
