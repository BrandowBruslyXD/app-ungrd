import { useEffect } from 'react';

const SUFIJO = 'ConectaRiesgo';

/**
 * Fija el título y la descripción de la pestaña según la pantalla.
 *
 * En una aplicación de una sola página el `<title>` no cambia solo, y eso tiene
 * dos costes: el buscador indexa todas las rutas con el mismo rótulo, y —lo que
 * pesa más aquí— quien deja la app abierta en una pestaña entre varias no
 * distingue cuál es. En una emergencia eso importa.
 *
 * La descripción se actualiza igual, aunque conviene saber que **los rastreadores
 * que no ejecutan JavaScript solo verán la de `index.html`**. Por eso la
 * portada, que es la dirección que de verdad se comparte por WhatsApp, lleva sus
 * etiquetas escritas de forma estática en el HTML.
 */
export function useTituloPagina(titulo: string, descripcion?: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${SUFIJO}` : SUFIJO;

    if (!descripcion) {
      return;
    }

    let etiqueta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!etiqueta) {
      etiqueta = document.createElement('meta');
      etiqueta.name = 'description';
      document.head.appendChild(etiqueta);
    }
    etiqueta.content = descripcion;
  }, [titulo, descripcion]);
}
