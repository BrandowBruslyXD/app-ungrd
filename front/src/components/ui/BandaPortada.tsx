import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Foto, { type FuenteFoto } from './Foto';

interface BandaPortadaProps {
  titulo: string;
  descripcion?: string;
  foto: FuenteFoto;
  /** Qué se ve en la foto. Vacío si es puramente decorativa. */
  alt?: string;
  icono?: LucideIcon;
  /** Acciones o datos que van a la derecha en pantalla ancha. */
  children?: ReactNode;
}

/**
 * Banda de encabezado con fotografía.
 *
 * Encabeza cada pantalla interna. No es adorno: la aplicación entera era color
 * plano sobre color plano, y una herramienta que la gente abre en el peor día
 * de su vida no debería sentirse como un formulario de trámites.
 *
 * La foto va detrás de un degradado del azul de marca, así que el texto blanco
 * mantiene su contraste pase lo que pase con la imagen —incluso si no carga,
 * porque debajo queda el color sólido—. El difuminado es del velo, no de la
 * foto: desenfocar la imagen en el navegador cuesta caro en teléfonos lentos.
 */
export default function BandaPortada({
  titulo,
  descripcion,
  foto,
  alt = '',
  icono: Icono,
  children,
}: BandaPortadaProps) {
  return (
    <section className="sobre-oscuro relative isolate overflow-hidden rounded-ficha bg-azul-800">
      <div className="absolute inset-0 -z-10">
        <Foto
          fuente={foto}
          alt={alt}
          proporcion="panoramica"
          className="h-full w-full [&>img]:h-full"
          sizes="(min-width: 1024px) 60rem, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-azul-900/95 via-azul-800/85 to-azul-700/60" />
      </div>

      <div className="flex flex-col gap-4 px-5 py-7 sm:px-7 sm:py-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icono && (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-white/15">
              <Icono className="h-7 w-7 text-oro-400" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl text-white sm:text-3xl">{titulo}</h1>
            {descripcion && (
              <p className="mt-2 max-w-2xl leading-relaxed text-azul-100">{descripcion}</p>
            )}
          </div>
        </div>

        {children && <div className="shrink-0">{children}</div>}
      </div>
    </section>
  );
}
