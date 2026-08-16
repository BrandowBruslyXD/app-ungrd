// VarField — editor de texto con VARIABLES COMO FICHAS (pills).
//
// El admin NUNCA ve `{{variable}}` en crudo: cada variable se pinta como una
// ficha visual (badge no editable, borrable como bloque). El texto normal se
// escribe normal. Internamente el valor SIGUE siendo un string con `{{var}}`,
// para que el backend lo interpole exactamente igual que antes.
//
// Props:
//  - value       (string) valor actual (puede traer `{{var}}`)
//  - onChange    (fn) recibe el nuevo string serializado
//  - vars        (string[]) nombres de variables disponibles para insertar
//  - multiline   (bool) si true, alto mayor + saltos de línea preservados
//  - placeholder (string) texto guía cuando está vacío
import { useEffect, useRef, useState } from 'react';

// Regex de variables: {{ nombre }} | {{nombre.prop}} (con espacios opcionales).
const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

// Escapa texto para inyectarlo como HTML (los nodos de texto se crean por DOM,
// pero la pill se construye con innerHTML en algunos casos; mejor prevenir).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Clases de la ficha/pill (badge con tinte de acento y el nombre en color de acento).
const PILL_CLASS =
  'inline-flex items-center rounded bg-accent/10 text-accent px-1.5 text-[12px] mx-0.5 align-baseline select-none';

// Construye el HTML interno del editor a partir del string `value`.
// El texto va como texto plano (escapado); cada variable como un <span>
// contenteditable="false" que se comporta como un bloque atómico.
function valueToHtml(value, multiline) {
  if (!value) return '';
  const parts = [];
  let last = 0;
  let m;
  VAR_RE.lastIndex = 0;
  while ((m = VAR_RE.exec(value)) !== null) {
    // Texto antes de la variable.
    if (m.index > last) parts.push(textToHtml(value.slice(last, m.index), multiline));
    // La pill de la variable.
    const name = m[1];
    parts.push(
      `<span contenteditable="false" data-var="${escapeHtml(name)}" class="${PILL_CLASS}">${escapeHtml(
        name,
      )}</span>`,
    );
    last = m.index + m[0].length;
  }
  // Texto final tras la última variable.
  if (last < value.length) parts.push(textToHtml(value.slice(last), multiline));
  return parts.join('');
}

// Convierte texto plano en HTML; en multilínea los `\n` se vuelven <br>.
function textToHtml(text, multiline) {
  const esc = escapeHtml(text);
  return multiline ? esc.replace(/\n/g, '<br>') : esc;
}

// Serializa el DOM del editor de vuelta a string con `{{var}}`.
// Recorre los childNodes: texto → su textContent; <span data-var> → `{{var}}`;
// <br> → `\n` (multilínea). Elementos de bloque (div/p) añaden salto de línea.
function domToValue(root, multiline) {
  let out = '';
  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = /** @type {HTMLElement} */ (child);
        if (el.dataset && el.dataset.var) {
          out += `{{${el.dataset.var}}}`;
        } else if (el.tagName === 'BR') {
          if (multiline) out += '\n';
        } else if (el.tagName === 'DIV' || el.tagName === 'P') {
          // Los navegadores envuelven líneas nuevas en <div>; cada bloque = salto.
          if (multiline && out && !out.endsWith('\n')) out += '\n';
          walk(el);
        } else {
          walk(el);
        }
      }
    });
  };
  walk(root);
  // En una sola línea no permitimos saltos.
  return multiline ? out : out.replace(/\n/g, ' ');
}

export default function VarField({
  value = '',
  onChange,
  vars = [],
  multiline = false,
  placeholder = '',
}) {
  const editorRef = useRef(null);
  // Último string que ESTE componente emitió. Sirve para no re-renderizar el
  // HTML (y resetear el cursor) cuando el cambio vino de la propia edición.
  const lastEmittedRef = useRef(value);
  const [showPicker, setShowPicker] = useState(false);

  // Sincroniza value → DOM SOLO cuando el cambio vino de fuera (no de teclear).
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = valueToHtml(value, multiline);
    lastEmittedRef.current = value;
  }, [value, multiline]);

  // Render inicial del HTML al montar.
  useEffect(() => {
    const el = editorRef.current;
    if (el) el.innerHTML = valueToHtml(value, multiline);
    lastEmittedRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Serializa el DOM y emite el nuevo string en cada cambio de contenido.
  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = domToValue(el, multiline);
    lastEmittedRef.current = next;
    onChange?.(next);
  };

  // Pegar como texto plano (evita HTML externo dentro del editor).
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    // En una sola línea, los saltos pegados se vuelven espacios.
    const clean = multiline ? text : text.replace(/\r?\n/g, ' ');
    document.execCommand('insertText', false, clean);
    // execCommand dispara input → emit se encarga vía onInput.
  };

  // Inserta una pill en la posición del cursor (o al final si no hay selección
  // dentro del editor). Usa la Selection/Range API.
  const insertVar = (name) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();

    // Construye el span de la pill.
    const span = document.createElement('span');
    span.setAttribute('contenteditable', 'false');
    span.setAttribute('data-var', name);
    span.className = PILL_CLASS;
    span.textContent = name;
    const space = document.createTextNode(' '); // espacio tras la ficha

    let range;
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      // Inserta en la posición actual del cursor.
      range = sel.getRangeAt(0);
      range.deleteContents();
    } else {
      // Sin selección dentro: inserta al final.
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    range.insertNode(space);
    range.insertNode(span);

    // Coloca el cursor después del espacio.
    range.setStartAfter(space);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    setShowPicker(false);
    emit();
  };

  // Estilos base tipo .input; multilínea = más alto + preserva saltos.
  const base =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/70 text-slate-900 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none';
  // Una línea: scroll horizontal (no truncate) → los valores largos (URLs,
  // correos, expresiones) siempre se pueden revisar completos.
  const sizing = multiline
    ? 'min-h-[80px] whitespace-pre-wrap'
    : 'min-h-[38px] overflow-x-auto whitespace-nowrap no-scrollbar';

  return (
    <div className="relative">
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline={multiline}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`${base} ${sizing}`}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
      />
      {/* Botón insertor de variables (su propio selector por campo). */}
      {vars.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="rounded bg-slate-900/[0.04] px-1.5 py-0.5 text-[11px] text-accent hover:bg-slate-900/[0.07]"
            // onMouseDown + preventDefault: no perder la selección del editor.
            onMouseDown={(e) => {
              e.preventDefault();
              setShowPicker((s) => !s);
            }}
            title="Insertar variable"
          >
            + var
          </button>
          {showPicker &&
            vars.map((v) => (
              <button
                key={v}
                type="button"
                className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent hover:bg-accent/20"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertVar(v);
                }}
                title={`Insertar ${v}`}
              >
                {v}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
