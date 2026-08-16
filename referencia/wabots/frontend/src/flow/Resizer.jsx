// Barra divisoria delgada para redimensionar paneles con el mouse.
// No usa librerías: estado de tamaño en px en el padre + listeners
// mousemove/mouseup en window mientras se arrastra.
//
// Props:
//  - orientation: 'vertical' (barra vertical, ajusta ANCHO) | 'horizontal' (barra
//    horizontal, ajusta ALTO). Por defecto 'vertical'.
//  - onResize(deltaPx): se llama en cada mousemove con el delta respecto al
//    inicio del arrastre. El padre decide cómo aplicar (sumar/restar, clamp).
//  - side: 'left' | 'right' (sólo informativo para el cursor); no afecta la lógica.
import { useCallback, useRef } from 'react';

export default function Resizer({ orientation = 'vertical', onResize }) {
  const startRef = useRef(0);

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const isVertical = orientation === 'vertical';
      startRef.current = isVertical ? e.clientX : e.clientY;
      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = isVertical ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev) => {
        const pos = isVertical ? ev.clientX : ev.clientY;
        const delta = pos - startRef.current;
        startRef.current = pos;
        onResize?.(delta);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [orientation, onResize],
  );

  const isVertical = orientation === 'vertical';
  return (
    <div
      onMouseDown={onMouseDown}
      className={
        isVertical
          ? 'group relative w-1.5 shrink-0 cursor-col-resize bg-slate-300/60 transition-colors hover:bg-brand/60'
          : 'group relative h-1.5 shrink-0 cursor-row-resize bg-slate-300/60 transition-colors hover:bg-brand/60'
      }
      title={isVertical ? 'Arrastra para ajustar el ancho' : 'Arrastra para ajustar el alto'}
    />
  );
}
