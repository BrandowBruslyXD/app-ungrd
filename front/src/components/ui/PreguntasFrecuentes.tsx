import { ChevronDown } from 'lucide-react';
import type { Pregunta } from '@/hooks/usePreguntasFrecuentes';

/**
 * Preguntas frecuentes.
 *
 * Construido con `<details>` nativo y no con un acordeón propio: funciona con
 * teclado, lo anuncia el lector de pantalla y **sigue abriéndose aunque el
 * JavaScript no haya cargado**, que en una conexión mala pasa más de lo que
 * parece. Un acordeón hecho a mano habría costado más y servido peor.
 *
 * El contenido no es relleno: son las dudas que la Alcaldía de Cali tuvo que
 * responder en rueda de prensa en agosto de 2026, incluida la del cobro por
 * entrar al censo, que era una estafa en curso.
 */
export default function PreguntasFrecuentes({ preguntas }: { preguntas: Pregunta[] }) {
  return (
    <div className="space-y-3">
      {preguntas.map(({ q, a }) => (
        <details key={q} className="ficha group overflow-hidden">
          <summary className="flex min-h-control cursor-pointer list-none items-center gap-3 px-4 py-3 font-bold text-tinta-900 hover:bg-tinta-50 sm:px-5 [&::-webkit-details-marker]:hidden">
            <ChevronDown
              className="h-6 w-6 shrink-0 text-azul-600 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{q}</span>
          </summary>
          <div className="border-t border-papel-borde px-4 py-4 sm:px-5">
            <p className="leading-relaxed text-tinta-700">{a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
