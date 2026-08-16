import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, PlayCircle } from 'lucide-react';
import { Player } from '@remotion/player';
import { ConectaRiesgoTutorial } from '../../../../remotion/Tutorial';
import { VIDEO } from '../../../../remotion/video';
import { useTituloPagina } from '@/hooks/useTituloPagina';

/**
 * Tutorial público reproducido dentro de la aplicación.
 *
 * Usa la misma composición que genera el MP4: la presentación en la UI y el
 * archivo exportado nunca pueden divergir. No consulta la API y todos sus
 * recursos viven en `public/`, por lo que también funciona con red inestable.
 */
export default function Tutorial() {
  useTituloPagina(
    'Tutorial de ConectaRiesgo',
    'Recorrido por el reporte ciudadano, su verificación y la coordinación institucional.',
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Link
        to="/"
        className="mb-5 inline-flex min-h-control items-center gap-2 rounded-control px-3 font-semibold text-azul-600 hover:bg-azul-50"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver a la portada
      </Link>

      <div className="mb-7 max-w-3xl">
        <p className="font-bold uppercase tracking-wider text-azul-600">Recorrido guiado</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Conoce el flujo completo en 45 segundos</h1>
        <p className="mt-3 text-lg leading-relaxed text-tinta-600">
          Desde el reporte de una emergencia hasta la verificación y la coordinación sectorial de
          la respuesta. Los datos que aparecen en este tutorial son ficticios.
        </p>
      </div>

      <section aria-label="Reproductor del tutorial" className="overflow-hidden rounded-ficha bg-azul-950 shadow-ficha-alta">
        <Player
          component={ConectaRiesgoTutorial}
          durationInFrames={VIDEO.durationInFrames}
          compositionWidth={VIDEO.width}
          compositionHeight={VIDEO.height}
          fps={VIDEO.fps}
          controls
          clickToPlay
          acknowledgeRemotionLicense
          style={{ width: '100%', aspectRatio: `${VIDEO.width} / ${VIDEO.height}` }}
        />
      </section>

      <div className="mt-6 ficha flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <PlayCircle className="mt-1 h-6 w-6 shrink-0 text-azul-600" aria-hidden="true" />
          <div>
            <h2 className="text-lg">¿Quieres probar el recorrido?</h2>
            <p className="mt-1 text-tinta-600">Entra a la aplicación y explora cada rol con datos de demostración.</p>
          </div>
        </div>
        <Link to="/entrar" className="btn-primary shrink-0">
          Entrar a la demo
          <ExternalLink className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
