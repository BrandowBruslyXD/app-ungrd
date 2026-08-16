import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, FileDown, FileText, ListOrdered, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import Ficha from '@/components/ui/Ficha';
import { formatearFechaHora } from './formato';

/** Lo que ya está hecho, lo que toca ahora y lo que todavía no. */
type EstadoPaso = 'hecho' | 'actual' | 'pendiente';

interface PasosDelPaqueteProps {
  /** ISO-8601 en UTC, o `null` si el informe todavía no se generó. */
  generadoEn: string | null;
  /** ISO-8601 en UTC de cuándo se abrió el diálogo de impresión, o `null`. */
  pdfAbiertoEn: string | null;
  /** ISO-8601 en UTC de la firma del envío, o `null` si no se ha remitido. */
  enviadoEn: string | null;
  enviado: boolean;
  /** Sin declaratoria no hay decreto que citar: el tercer paso no procede. */
  puedeRemitir: boolean;
  nombreCsv: string;
  onGenerar: () => void;
  onDescargarPdf: () => void;
  onDescargarCsv: () => void;
}

const CLASES_ESTADO: Record<EstadoPaso, { marca: string; etiqueta: string }> = {
  hecho: { marca: 'border-seguro-600 text-seguro-700', etiqueta: 'text-seguro-700' },
  actual: { marca: 'border-azul-600 bg-azul-600 text-white', etiqueta: 'text-azul-700' },
  pendiente: { marca: 'border-tinta-300 text-tinta-500', etiqueta: 'text-tinta-500' },
};

interface PasoProps {
  numero: number;
  titulo: string;
  estado: EstadoPaso;
  etiquetaEstado: string;
  children: ReactNode;
}

/**
 * Un renglón del proceso.
 *
 * Renglón y no tarjeta: son tres cosas que pasan una detrás de otra, y una
 * rejilla de tarjetas iguales las presenta como tres opciones entre las que
 * elegir. El número, la marca de hecho y la palabra del estado dicen lo mismo
 * por tres vías distintas, así que el orden se entiende sin distinguir colores.
 */
function Paso({ numero, titulo, estado, etiquetaEstado, children }: PasoProps) {
  const clases = CLASES_ESTADO[estado];

  return (
    <li
      className="evitar-corte flex gap-3 border-t border-papel-borde px-4 py-4 first:border-t-0 sm:gap-4 sm:px-5"
      aria-current={estado === 'actual' ? 'step' : undefined}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums ${clases.marca}`}
        aria-hidden="true"
      >
        {estado === 'hecho' ? <Check className="h-4 w-4" /> : numero}
      </span>

      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base text-tinta-900">{titulo}</h3>
          <span className={`text-sm font-semibold ${clases.etiqueta}`}>{etiquetaEstado}</span>
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * Los tres pasos de la remisión de **este** paquete: generar el informe,
 * descargar el PDF y enviarlo por correo.
 *
 * No confundir con el `PasosDelEnvio` del panel del desastre: aquel enuncia el
 * procedimiento para las trece entidades y solo el primer paso es accionable
 * desde allí; este es el que de verdad ejecuta los tres, para un ministerio.
 *
 * Existe porque el proceso no se adivinaba. La pantalla tenía las acciones
 * repartidas y quien la abría por primera vez no sabía que había un orden ni
 * que el PDF se obtiene del diálogo del navegador. Aquí el orden está escrito,
 * cada paso dice si está hecho y el siguiente es el único que ofrece un botón
 * en azul.
 *
 * El aviso de «Guardar como PDF» va pegado al botón y no en la ayuda de la
 * página: es el único punto donde la aplicación depende de una decisión que se
 * toma fuera de ella, en un diálogo que además cambia de sitio según el
 * navegador.
 */
export default function PasosDelPaquete({
  generadoEn,
  pdfAbiertoEn,
  enviadoEn,
  enviado,
  puedeRemitir,
  nombreCsv,
  onGenerar,
  onDescargarPdf,
  onDescargarCsv,
}: PasosDelPaqueteProps) {
  const { t } = useTranslation();

  const generado = generadoEn !== null;
  const pdfAbierto = pdfAbiertoEn !== null;

  const hechos = [generado, pdfAbierto, enviado].filter(Boolean).length;

  const estadoPaso = (hecho: boolean, listo: boolean): EstadoPaso =>
    hecho ? 'hecho' : listo ? 'actual' : 'pendiente';

  const etiqueta = (estado: EstadoPaso): string =>
    estado === 'hecho'
      ? t('ungrd.paquete.pasoHecho')
      : estado === 'actual'
        ? t('ungrd.paquete.pasoSiguiente')
        : t('ungrd.paquete.pasoPendiente');

  const estadoGenerar = estadoPaso(generado, true);
  const estadoPdf = estadoPaso(pdfAbierto, generado);
  /* Sin decreto que lo ampare, el tercer paso nunca es «el siguiente»: queda
     pendiente de un trámite que no ocurre en esta pantalla. Marcarlo como
     accionable invitaría a remitir un oficio que no se puede remitir. */
  const estadoCorreo = estadoPaso(enviado, pdfAbierto && puedeRemitir);

  return (
    <Ficha
      titulo={t('ungrd.paquete.pasosTitulo')}
      icono={ListOrdered}
      apunte={t('ungrd.paquete.pasosAvance', { hechos })}
      sinRelleno
    >
      {/* Un paquete remitido en una sesión anterior llega sin la fecha en que se
          armó su informe. Se dice, en vez de marcar como hechos dos pasos de
          los que esta pantalla no tiene constancia. */}
      {enviado && !generado && (
        <p className="border-b border-papel-borde bg-papel-hueco px-4 py-3 text-sm text-tinta-700 sm:px-5">
          {t('ungrd.paquete.pasosYaRemitido')}
        </p>
      )}

      <ol>
        <Paso
          numero={1}
          titulo={t('ungrd.paquete.pasoGenerarTitulo')}
          estado={estadoGenerar}
          etiquetaEstado={etiqueta(estadoGenerar)}
        >
          <p className="mt-1 text-sm text-tinta-600">{t('ungrd.paquete.pasoGenerarTexto')}</p>

          {generadoEn === null ? (
            <button type="button" onClick={onGenerar} className="btn-primary mt-3 w-full sm:w-auto">
              <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t('ungrd.paquete.pasoGenerarAccion')}
            </button>
          ) : (
            <p className="mt-2 text-sm font-semibold text-tinta-800">
              {t('ungrd.paquete.pasoGenerarHecho', { fecha: formatearFechaHora(generadoEn) })}
            </p>
          )}
        </Paso>

        <Paso
          numero={2}
          titulo={t('ungrd.paquete.pasoPdfTitulo')}
          estado={estadoPdf}
          etiquetaEstado={etiqueta(estadoPdf)}
        >
          <p className="mt-1 text-sm text-tinta-600">{t('ungrd.paquete.pasoPdfTexto')}</p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onDescargarPdf}
              disabled={!generado}
              aria-describedby={generado ? undefined : 'pdf-pendiente'}
              className={generado && !pdfAbierto ? 'btn-primary' : 'btn-secondary'}
            >
              <Printer className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t('ungrd.paquete.descargarPdf')}
            </button>

            {/* El CSV no depende del informe: es el mismo detalle en datos, y el
                ministerio lo pide para trabajarlo en su propia hoja de cálculo. */}
            <button type="button" onClick={onDescargarCsv} className="btn-secondary">
              <FileDown className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t('ungrd.paquete.descargarCsv')}
            </button>
          </div>

          {!generado && (
            <p id="pdf-pendiente" className="mt-2 text-sm text-tinta-600">
              {t('ungrd.paquete.pdfPendiente')}
            </p>
          )}

          {pdfAbiertoEn !== null && (
            <p className="mt-2 text-sm font-semibold text-tinta-800">
              {t('ungrd.paquete.pasoPdfHecho', { fecha: formatearFechaHora(pdfAbiertoEn) })}
            </p>
          )}

          <p className="mt-2 break-all font-mono text-xs text-tinta-500">{nombreCsv}</p>
          <p className="mt-1 text-sm text-tinta-600">{t('ungrd.paquete.csvAyuda')}</p>
        </Paso>

        <Paso
          numero={3}
          titulo={t('ungrd.paquete.pasoCorreoTitulo')}
          estado={estadoCorreo}
          etiquetaEstado={etiqueta(estadoCorreo)}
        >
          {puedeRemitir ? (
            <p className="mt-1 text-sm text-tinta-600">{t('ungrd.paquete.pasoCorreoTexto')}</p>
          ) : (
            /* Se dice por qué no procede, en el mismo sitio donde el panel del
               desastre ya lo advierte. Las dos pantallas tienen que contar lo
               mismo: si aquí callara, el funcionario bajaría a firmar el envío. */
            <p className="mt-1 flex gap-2 text-sm leading-snug text-espera-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('ungrd.paquete.pasoCorreoSinDecreto')}</span>
            </p>
          )}

          {enviado && (
            <p className="mt-2 text-sm font-semibold text-tinta-800">
              {enviadoEn === null
                ? t('ungrd.paquete.pasoCorreoHechoSinFecha')
                : t('ungrd.paquete.pasoCorreoHecho', { fecha: formatearFechaHora(enviadoEn) })}
            </p>
          )}
        </Paso>
      </ol>
    </Ficha>
  );
}
