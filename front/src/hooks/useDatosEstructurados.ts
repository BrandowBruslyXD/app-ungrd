import { useEffect } from 'react';

/**
 * Inserta un bloque JSON-LD en el documento mientras la pantalla está montada.
 *
 * Se hace desde React y no en `index.html` porque el contenido sale del archivo
 * de textos: escribirlo dos veces garantiza que un día dejen de coincidir, y un
 * dato estructurado que no corresponde con lo que se ve en pantalla es peor que
 * no tenerlo. Google ejecuta JavaScript, así que lo lee igual.
 *
 * El bloque se retira al desmontar para que no se acumulen esquemas de pantallas
 * anteriores al navegar.
 */
export function useDatosEstructurados(id: string, datos: unknown): void {
  useEffect(() => {
    const etiqueta = document.createElement('script');
    etiqueta.type = 'application/ld+json';
    etiqueta.id = id;
    etiqueta.textContent = JSON.stringify(datos);
    document.head.appendChild(etiqueta);

    return () => {
      etiqueta.remove();
    };
  }, [id, datos]);
}
