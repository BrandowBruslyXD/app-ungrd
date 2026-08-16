import { useId } from 'react';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
  /** Una línea que explica qué significa la opción, en lenguaje llano. */
  descripcion?: string;
  icono?: LucideIcon;
}

interface BaseProps<T extends string> {
  titulo: string;
  ayuda?: string;
  opciones: ReadonlyArray<Opcion<T>>;
  /** Una columna en móvil; dos desde tablet cuando las etiquetas son cortas. */
  columnas?: 1 | 2;
  error?: string;
}

interface PropsUnica<T extends string> extends BaseProps<T> {
  multiple?: false;
  valor: T | '';
  onChange: (valor: T) => void;
}

interface PropsMultiple<T extends string> extends BaseProps<T> {
  multiple: true;
  valor: readonly T[];
  onChange: (valor: T[]) => void;
}

type GrupoOpcionesProps<T extends string> = PropsUnica<T> | PropsMultiple<T>;

/**
 * Grupo de opciones en cajas grandes, no en radios diminutos.
 *
 * Es el control más importante de la app para el público al que sirve: una caja
 * de 56px que se toca con el pulgar, con la etiqueta escrita completa al lado
 * del icono. Un radio de 16px con texto truncado deja por fuera a quien tiene
 * la vista cansada o la mano temblorosa.
 *
 * Por dentro son `input` nativos ocultos: así el teclado, el lector de pantalla
 * y los grupos de radio funcionan sin reimplementar nada.
 */
export default function GrupoOpciones<T extends string>(props: GrupoOpcionesProps<T>) {
  const { titulo, ayuda, opciones, columnas = 1, error } = props;
  const nombre = useId();
  const idAyuda = `${nombre}-ayuda`;
  const idError = `${nombre}-error`;

  const estaActiva = (valor: T): boolean =>
    props.multiple ? props.valor.includes(valor) : props.valor === valor;

  const alternar = (valor: T): void => {
    if (props.multiple) {
      const actual = props.valor;
      props.onChange(actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor]);
    } else {
      props.onChange(valor);
    }
  };

  const descritoPor = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ');

  return (
    <fieldset aria-describedby={descritoPor || undefined}>
      <legend className="etiqueta">{titulo}</legend>
      {ayuda && (
        <span id={idAyuda} className="etiqueta-ayuda">
          {ayuda}
        </span>
      )}

      <div className={columnas === 2 ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2'}>
        {opciones.map(({ valor, etiqueta, descripcion, icono: Icono }) => {
          const activa = estaActiva(valor);
          return (
            <label
              key={valor}
              className={`opcion cursor-pointer ${activa ? 'opcion-activa' : ''} ${
                descripcion ? 'items-start py-3.5' : ''
              }`}
            >
              <input
                type={props.multiple ? 'checkbox' : 'radio'}
                name={nombre}
                value={valor}
                checked={activa}
                onChange={() => alternar(valor)}
                className="sr-only"
              />

              {Icono && (
                <Icono
                  className={`h-6 w-6 shrink-0 ${activa ? 'text-azul-600' : 'text-tinta-400'}`}
                  aria-hidden="true"
                />
              )}

              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{etiqueta}</span>
                {descripcion && (
                  <span className="mt-0.5 block text-sm font-normal leading-snug text-tinta-500">
                    {descripcion}
                  </span>
                )}
              </span>

              {/* La marca de selección es forma, no solo color: un cuadro vacío
                  frente a uno con chulo se distingue en blanco y negro. */}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 ${
                  props.multiple ? 'rounded-md' : 'rounded-full'
                } ${activa ? 'border-azul-600 bg-azul-600' : 'border-tinta-300 bg-white'}`}
                aria-hidden="true"
              >
                {activa && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={idError} className="mt-2 text-sm font-semibold text-alerta-700" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
