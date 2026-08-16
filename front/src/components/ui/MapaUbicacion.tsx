import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Loader2 } from 'lucide-react';
import {
  CAPA_DE_RESPALDO,
  CAPA_INICIAL_EDICION,
  CAPA_INICIAL_LECTURA,
  ESPERA_MAXIMA_SATELITE_MS,
  TESELA_TRANSPARENTE,
  construirCapasBase,
  fechaImagenGibs,
  textoFechaImagen,
  type ClaveCapaBase,
} from '@/lib/capasMapa';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface PuntoMapa extends Coordenadas {
  id: string;
  titulo: string;
  /** Color del marcador. Por omisión, el azul de marca. */
  tono?: TonoMarcador;
  /** Segunda línea del globo: estado, dirección, lo que ubique al caso. */
  detalle?: string;
}

interface MapaUbicacionProps {
  valor: Coordenadas | null;
  /** Si se omite, el mapa es de solo lectura. */
  onChange?: (coordenadas: Coordenadas) => void;
  /**
   * Puntos adicionales que solo se muestran, como las emergencias cercanas.
   * Al tocarlos sale su nombre.
   */
  marcadores?: readonly PuntoMapa[];
  /** Centro inicial cuando todavía no hay punto escogido. */
  centroPorDefecto?: Coordenadas;
  zoomPorDefecto?: number;
  alto?: string;
  /**
   * Con qué capa base arranca el mapa. Si se omite, un mapa de solo lectura
   * abre con la imagen del satélite y uno editable con las calles.
   */
  capaInicial?: ClaveCapaBase;
}

/**
 * Teselas fallidas seguidas que se toleran antes de dar la capa por caída.
 *
 * No basta con una: en el borde del mundo siempre falta alguna y eso no
 * significa que el servicio esté abajo.
 */
const FALLOS_PARA_DESCARTAR_SATELITE = 4;

/** Bogotá. Sirve de centro cuando no hay ni punto elegido ni permiso de GPS. */
const CENTRO_COLOMBIA: Coordenadas = { lat: 4.711, lng: -74.0721 };

/*
 * Marcador dibujado a mano en SVG.
 *
 * Leaflet trae sus iconos como archivos PNG que resuelve por ruta relativa, y
 * con un empaquetador esa ruta se rompe: el resultado clásico es un mapa con
 * marcadores invisibles. Un SVG embebido evita el problema, pesa menos y se
 * pinta con el azul de la marca.
 */
/** Los tonos del marcador coinciden con la prioridad del contrato de API. */
export type TonoMarcador = 'marca' | 'alta' | 'media' | 'baja';

const RELLENO: Record<TonoMarcador, string> = {
  marca: '#0a3a8f', // azul de marca: el punto que se está escogiendo
  alta: '#ce1126', // rojo bandera
  media: '#b35009', // naranja
  baja: '#117a50', // verde
};

function crearIcono(tono: TonoMarcador): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12.2 15.2 27.5 15.8 28.2a1.6 1.6 0 0 0 2.4 0C18.8 44.5 34 29.2 34 17 34 7.6 26.4 0 17 0z" fill="${RELLENO[tono]}"/>
      <circle cx="17" cy="17" r="6.5" fill="#ffffff"/>
    </svg>`,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
  });
}

const ICONO_MARCADOR = crearIcono('marca');

/**
 * Mapa para escoger o mostrar un punto.
 *
 * Se usa **Leaflet directo, sin `react-leaflet`**. No es capricho: `react-leaflet`
 * se publica bajo la licencia Hippocratic 2.1, que no está aprobada por la OSI e
 * impone restricciones de uso. Leaflet a secas es BSD-2-Clause, sin ataduras, y
 * el envoltorio que hace falta cabe en este archivo.
 *
 * **La atribución a OpenStreetMap no se puede quitar.** Los datos son ODbL y
 * exigen crédito visible; Leaflet la pinta en la esquina y así se queda. Lo
 * mismo vale para la imagen de NASA GIBS.
 */
export default function MapaUbicacion({
  valor,
  onChange,
  marcadores,
  centroPorDefecto = CENTRO_COLOMBIA,
  zoomPorDefecto = 6,
  alto = 'h-72',
  capaInicial,
}: MapaUbicacionProps) {
  const { t } = useTranslation();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marcador = useRef<L.Marker | null>(null);
  const capaPuntos = useRef<L.LayerGroup | null>(null);
  const alCambiar = useRef(onChange);
  const idDescripcion = useId();

  const [buscandoGps, setBuscandoGps] = useState(false);
  const [errorGps, setErrorGps] = useState('');

  // La fecha se calcula una sola vez por montaje: si cambiara sola, Leaflet
  // recargaría todas las teselas mientras el gestor está mirando el mapa.
  const fechaSatelite = useMemo(() => fechaImagenGibs(), []);
  const capas = useMemo(() => construirCapasBase(fechaSatelite), [fechaSatelite]);

  const [sateliteCaido, setSateliteCaido] = useState(false);
  const [capaActiva, setCapaActiva] = useState<ClaveCapaBase>(
    capaInicial ?? (onChange ? CAPA_INICIAL_EDICION : CAPA_INICIAL_LECTURA),
  );

  const capasOfrecidas = useMemo(
    () => capas.filter((capa) => capa.clave !== 'satelite' || !sateliteCaido),
    [capas, sateliteCaido],
  );

  // Se guarda en una referencia para no recrear el mapa cada vez que el padre
  // vuelve a renderizar con una función nueva.
  alCambiar.current = onChange;

  useEffect(() => {
    if (!contenedor.current || mapa.current) {
      return;
    }

    const inicial = valor ?? centroPorDefecto;
    const instancia = L.map(contenedor.current, {
      center: [inicial.lat, inicial.lng],
      zoom: valor ? 16 : zoomPorDefecto,
      // El zoom con la rueda sin querer es un clásico al desplazarse por la
      // página en móvil. Se deja el control de +/- que sí es deliberado.
      scrollWheelZoom: false,
    });

    // La capa base la pone el efecto de abajo, que además la cambia cuando el
    // usuario toca el conmutador.

    if (valor) {
      marcador.current = L.marker([valor.lat, valor.lng], { icon: ICONO_MARCADOR }).addTo(instancia);
    }

    if (onChange) {
      instancia.on('click', (evento: L.LeafletMouseEvent) => {
        const { lat, lng } = evento.latlng;
        alCambiar.current?.({ lat, lng });
      });
    }

    mapa.current = instancia;

    return () => {
      instancia.remove();
      mapa.current = null;
      marcador.current = null;
    };
    // Solo al montar: el resto de cambios se sincroniza en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Monta la capa base activa y la reemplaza al cambiar de capa.
   *
   * Va en su propio efecto —y no en el del montaje— porque la capa es lo único
   * que se puede caer: así se recrea sola sin volver a construir el mapa, sin
   * perder el encuadre ni los marcadores.
   */
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) {
      return;
    }

    const definicion =
      capas.find((capa) => capa.clave === capaActiva) ?? capas[capas.length - 1];

    const capa = L.tileLayer(definicion.plantillaUrl, {
      attribution: definicion.atribucion,
      maxZoom: definicion.maxZoom,
      // Pasado este nivel el servidor no tiene teselas. Sin esto el mapa se
      // queda gris al acercarse; con esto Leaflet reescala la última buena.
      maxNativeZoom: definicion.maxNativeZoom,
      subdomains: definicion.subdominios ?? 'abc',
      // Una tesela que falta se ve como un hueco transparente, nunca como el
      // icono de imagen rota del navegador.
      errorTileUrl: TESELA_TRANSPARENTE,
    }).addTo(instancia);

    if (definicion.clave !== 'satelite') {
      return () => {
        capa.remove();
      };
    }

    /*
     * GIBS es un servicio ajeno y la regla del proyecto es que nada se rompe por
     * uno: si en cinco segundos no ha llegado ni una tesela, o si fallan varias
     * seguidas sin que llegue ninguna, la opción satelital desaparece del
     * conmutador y el mapa se queda en calles. Sin mensaje de error y sin hueco.
     */
    let respondio = false;
    let fallos = 0;
    let reloj: number | undefined;

    const descartarSatelite = (): void => {
      setSateliteCaido(true);
      setCapaActiva(CAPA_DE_RESPALDO);
    };

    const detenerReloj = (): void => {
      if (reloj !== undefined) {
        window.clearTimeout(reloj);
        reloj = undefined;
      }
    };

    // El reloj arranca cuando Leaflet empieza a pedir teselas, no al montar: si
    // el mapa todavía no tiene tamaño —dentro de una pestaña oculta, por
    // ejemplo— no hay petición que esperar y descartar la capa sería injusto.
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

  // Pinta los puntos de solo lectura y encuadra el mapa para que quepan todos.
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !marcadores?.length) {
      return;
    }

    const escapar = (texto: string): string =>
      texto.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

    const capa = L.layerGroup(
      marcadores.map((punto) =>
        L.marker([punto.lat, punto.lng], {
          icon: crearIcono(punto.tono ?? 'marca'),
          title: punto.titulo,
          alt: punto.titulo,
        }).bindPopup(
          // Se escapa porque el título viene de lo que escribió un ciudadano.
          `<strong>${escapar(punto.titulo)}</strong>` +
            (punto.detalle ? `<br>${escapar(punto.detalle)}` : ''),
        ),
      ),
    ).addTo(instancia);

    capaPuntos.current = capa;
    instancia.fitBounds(
      L.latLngBounds(marcadores.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [40, 40], maxZoom: 13 },
    );

    return () => {
      capa.remove();
      capaPuntos.current = null;
    };
  }, [marcadores]);

  // Sincroniza el marcador cuando el punto cambia desde fuera (GPS, o un clic).
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) {
      return;
    }

    if (!valor) {
      marcador.current?.remove();
      marcador.current = null;
      return;
    }

    if (marcador.current) {
      marcador.current.setLatLng([valor.lat, valor.lng]);
    } else {
      marcador.current = L.marker([valor.lat, valor.lng], { icon: ICONO_MARCADOR }).addTo(instancia);
    }

    instancia.setView([valor.lat, valor.lng], Math.max(instancia.getZoom(), 16));
  }, [valor]);

  function usarMiUbicacion(): void {
    if (!navigator.geolocation) {
      setErrorGps(t('mapa.gpsNoDisponible'));
      return;
    }

    setBuscandoGps(true);
    setErrorGps('');

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setBuscandoGps(false);
        alCambiar.current?.({
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        });
      },
      () => {
        // No se distingue el motivo a propósito: al usuario le da igual si fue
        // permiso denegado o señal perdida. Lo que necesita saber es que puede
        // tocar el mapa en su lugar.
        setBuscandoGps(false);
        setErrorGps(t('mapa.gpsFallo'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  const editable = Boolean(onChange);

  return (
    <div>
      {editable && (
        <p id={idDescripcion} className="etiqueta-ayuda">
          {t('mapa.instruccion')}
        </p>
      )}

      <div className="relative">
        <div
          ref={contenedor}
          className={`w-full overflow-hidden rounded-control border-2 border-tinta-200 ${alto}`}
          role={editable ? 'application' : 'img'}
          aria-label={editable ? t('mapa.etiquetaEditable') : t('mapa.etiquetaLectura')}
          aria-describedby={editable ? idDescripcion : undefined}
        />

        {capasOfrecidas.length > 1 && (
          /*
           * Botones propios en vez del control de capas de Leaflet: el suyo es
           * un menú de radios de 14px que no llega al área tocable mínima ni
           * hereda la paleta. Van fuera del contenedor del mapa para que el clic
           * no llegue a Leaflet y mueva el punto elegido.
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

      {/*
       * La honestidad del dato: el satélite pasa dos veces al día, así que lo
       * que se ve es la última pasada completa, no «tiempo real». La fecha va
       * escrita para que nadie tenga que suponerla.
       */}
      {capaActiva === 'satelite' && !sateliteCaido && (
        <p className="mt-2 text-sm text-tinta-600">
          <span className="font-semibold text-tinta-800">
            {t('mapa.capas.pieSatelite', { fecha: textoFechaImagen(fechaSatelite) })}
          </span>{' '}
          {t('mapa.capas.avisoSatelite')}
        </p>
      )}

      {editable && (
        <>
          <button
            type="button"
            onClick={usarMiUbicacion}
            disabled={buscandoGps}
            className="btn-secondary mt-3 w-full"
          >
            {buscandoGps ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-6 w-6" aria-hidden="true" />
            )}
            {buscandoGps ? t('mapa.buscando') : t('mapa.usarMiUbicacion')}
          </button>

          {errorGps && (
            <p className="mt-2 text-sm font-semibold text-alerta-700" role="alert">
              {errorGps}
            </p>
          )}

          {valor && (
            <p className="mt-2 font-mono text-sm text-tinta-600">
              {t('mapa.puntoElegido', {
                lat: valor.lat.toFixed(5),
                lng: valor.lng.toFixed(5),
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
