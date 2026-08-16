import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook para el patrón fetch + loading + error.
 *
 * Uso: `const { data, loading, error, reload } = useAsync(fn, deps)`.
 * - `fn` es la función async que obtiene los datos (se relee en cada ejecución,
 *   por lo que puede cerrar sobre estado sin figurar en `deps`).
 * - `deps` dispara la recarga automática al cambiar.
 * - `reload` fuerza una recarga manual.
 * - Con flag de cancelación: nunca hace setState tras el desmontaje ni tras
 *   una recarga posterior (evita respuestas fuera de orden).
 * - En caso de error, `data` conserva el último valor exitoso.
 */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  // Referencia siempre actualizada a `fn` para no exigirla en `deps`.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const result = await fnRef.current();
        if (alive) setData(result);
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // `deps` las define el llamador; `tick` habilita el reload manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload };
}

export default useAsync;
