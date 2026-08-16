/**
 * El escudo de ConectaRiesgoAI.
 *
 * Existe como componente y no como una etiqueta `img` suelta porque la marca
 * aparece en la cabecera, en el pie y en el talón de seguimiento: tenerla en un
 * solo sitio evita que cada uno la dibuje con un tamaño distinto.
 *
 * El escudo va sobre un cuadro blanco a propósito. La imagen trae fondo blanco
 * —el original no tiene transparencia— y la cabecera es azul; sin el cuadro se
 * vería un recuadro sucio recortado contra el azul.
 *
 * `width` y `height` van explícitos para que el navegador reserve el espacio
 * antes de descargar la imagen y el texto de al lado no salte al cargar, que con
 * conexión lenta es justo lo que se nota.
 */
interface Props {
  /** Lado del cuadro. `sm` para el pie, `md` para la cabecera. */
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CAJA = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
} as const;

const GLIFO = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-14 w-14',
} as const;

export default function Logotipo({ tamano = 'md', className = '' }: Props) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-control bg-white ${CAJA[tamano]} ${className}`}
    >
      <img
        src="/marca/escudo-96.png"
        srcSet="/marca/escudo-48.png 48w, /marca/escudo-96.png 96w, /marca/escudo-144.png 144w"
        sizes="44px"
        width={96}
        height={96}
        alt=""
        aria-hidden="true"
        decoding="async"
        className={GLIFO[tamano]}
      />
    </span>
  );
}
