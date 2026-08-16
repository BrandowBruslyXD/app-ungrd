// Barra lateral izquierda con los nodos disponibles, agrupados por categoría.
// Cada item es arrastrable: en dragstart escribe el JSON del item en el
// dataTransfer con el MIME 'application/waflow'.
import { PALETTE, GROUPS, GROUP_META } from './palette';

export const DND_MIME = 'application/waflow';

export default function Palette() {
  const onDragStart = (event, item) => {
    event.dataTransfer.setData(DND_MIME, JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="flex h-full w-full min-h-0 flex-col overflow-y-auto bg-[#f0f4fa]">
      <div className="border-b border-slate-200/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Nodos</h2>
        <p className="text-xs text-slate-500">Arrastra al lienzo</p>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {GROUPS.map((group) => {
          const items = PALETTE.filter((p) => p.group === group);
          if (!items.length) return null;
          const meta = GROUP_META[group] || {};
          return (
            <div key={group}>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span>{meta.emoji}</span>
                <span>{group}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    title={item.description}
                    className="cursor-grab rounded-xl border border-slate-200/80 bg-slate-900/[0.04] px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-900/[0.07] hover:shadow-soft active:cursor-grabbing"
                    style={{ borderLeft: `3px solid ${meta.color || '#cbd5e1' /* = slate-300 */}` }}
                  >
                    <div className="font-medium text-slate-900">{item.label}</div>
                    <div className="text-[11px] leading-tight text-slate-500">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
