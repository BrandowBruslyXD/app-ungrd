import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface EncabezadoPaginaProps {
  titulo: string;
  /** Una frase que dice para qué sirve esta pantalla. */
  descripcion?: string;
  volverA?: string;
  volverEtiqueta?: string;
}

/**
 * Encabezado de pantalla.
 *
 * El enlace de volver es un control de 56px con la palabra escrita, no una
 * flecha suelta de 16px: para mucha gente mayor una flecha sin texto no es un
 * botón, es un adorno.
 */
export default function EncabezadoPagina({
  titulo,
  descripcion,
  volverA,
  volverEtiqueta,
}: EncabezadoPaginaProps) {
  return (
    <div className="mb-6">
      {volverA && volverEtiqueta && (
        <Link
          to={volverA}
          className="-ml-3 mb-2 inline-flex min-h-control items-center gap-2 rounded-control px-3 text-base font-semibold text-azul-600 hover:bg-azul-50"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          {volverEtiqueta}
        </Link>
      )}
      <h1 className="text-2xl sm:text-3xl">{titulo}</h1>
      {descripcion && <p className="mt-2 max-w-2xl text-tinta-600">{descripcion}</p>}
    </div>
  );
}
