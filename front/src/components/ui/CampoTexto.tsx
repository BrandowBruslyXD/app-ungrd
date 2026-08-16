import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface CampoTextoProps {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  /** Frase corta en lenguaje llano que explica para qué sirve el campo. */
  ayuda?: string;
  error?: string;
  tipo?: 'text' | 'tel' | 'email' | 'number' | 'date';
  marcador?: string;
  obligatorio?: boolean;
  /** Renderiza un área de varias líneas en vez de una sola. */
  multilinea?: boolean;
  filas?: number;
  /** Muestra el valor en monoespaciada: documentos, códigos, teléfonos. */
  mono?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
  maxLength?: number;
}

/**
 * Campo de texto con etiqueta, ayuda y error, todo enlazado por accesibilidad.
 *
 * El error se anuncia y se describe con palabras, nunca solo pintando el borde
 * de rojo: quien no distingue colores tiene que poder saber qué está mal.
 */
export default function CampoTexto({
  etiqueta,
  valor,
  onChange,
  ayuda,
  error,
  tipo = 'text',
  marcador,
  obligatorio,
  multilinea,
  filas = 4,
  mono,
  inputMode,
  autoComplete,
  maxLength,
}: CampoTextoProps) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;

  const descritoPor = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ');

  const clasesComunes = [
    multilinea ? 'campo-area' : 'campo',
    error ? 'campo-error' : '',
    mono ? 'font-mono tracking-wide' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
        {obligatorio && (
          <span className="ml-1 font-normal text-alerta-600" aria-hidden="true">
            *
          </span>
        )}
        {obligatorio && <span className="solo-lector"> (obligatorio)</span>}
      </label>

      {ayuda && (
        <span id={idAyuda} className="etiqueta-ayuda">
          {ayuda}
        </span>
      )}

      {multilinea ? (
        <textarea
          id={id}
          rows={filas}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={marcador}
          maxLength={maxLength}
          className={clasesComunes}
          aria-describedby={descritoPor || undefined}
          aria-invalid={error ? true : undefined}
          aria-required={obligatorio}
        />
      ) : (
        <input
          id={id}
          type={tipo}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={marcador}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={clasesComunes}
          aria-describedby={descritoPor || undefined}
          aria-invalid={error ? true : undefined}
          aria-required={obligatorio}
        />
      )}

      {error && (
        <p id={idError} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-alerta-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
