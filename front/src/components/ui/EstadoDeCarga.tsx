import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

/**
 * Lo que se ve mientras los datos llegan, y lo que se ve cuando no llegan.
 *
 * Se hizo un componente porque hasta ahora ninguna pantalla mostraba nada: los
 * datos eran locales y aparecían al instante. Contra un servidor eso deja de ser
 * cierto, y una pantalla en blanco durante cuatro segundos con mala señal se lee
 * como una aplicación rota.
 *
 * El error nunca muestra el código HTTP ni el detalle técnico —eso va al
 * registro— y siempre ofrece reintentar: quien está en una emergencia necesita
 * saber qué hacer, no qué falló.
 */

interface PropsCargando {
  /** Cuántas fichas fantasma dibujar. Conviene que se parezca a lo que viene. */
  filas?: number;
  etiqueta?: string;
}

export function Cargando({ filas = 3, etiqueta = 'Cargando reportes' }: PropsCargando) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="ficha animate-pulse p-4" aria-hidden="true">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-control bg-tinta-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-tinta-100" />
              <div className="h-3 w-1/2 rounded bg-tinta-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PropsError {
  mensaje: string;
  onReintentar?: () => void;
}

export function ErrorAlCargar({ mensaje, onReintentar }: PropsError) {
  return (
    <div role="alert" className="ficha border-2 border-alerta-200 bg-alerta-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 shrink-0 text-alerta-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-tinta-900">No pudimos cargar la información</p>
          <p className="mt-1 leading-relaxed text-tinta-700">{mensaje}</p>
          {onReintentar && (
            <button type="button" onClick={onReintentar} className="btn-primary mt-4">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              Intentar de nuevo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Aviso de que lo que se ve salió del teléfono y no del servidor.
 *
 * Importa decirlo: el ciudadano tiene que saber que su reporte todavía no llegó
 * a la entidad, o creerá que alguien ya lo está atendiendo.
 */
export function AvisoSinConexion() {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-ficha border-2 border-espera-200 bg-espera-50 p-4"
    >
      <WifiOff className="h-5 w-5 shrink-0 text-espera-700" aria-hidden="true" />
      <p className="leading-relaxed text-tinta-800">
        Sin conexión con el servidor. Estás viendo lo que quedó guardado en este teléfono; cuando
        vuelva la señal se enviará.
      </p>
    </div>
  );
}
