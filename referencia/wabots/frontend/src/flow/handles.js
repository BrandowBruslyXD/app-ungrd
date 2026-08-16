// Helpers que describen los puntos de conexión (handles) de cada tipo de nodo,
// usados por el lienzo y por la validación de conexiones.

// Tipos que disponen de salida de error (integraciones).
const ERROR_TYPES = new Set([
  'aiAgent',
  'httpRequest',
  'gmail',
  'calendar',
  'reminder',
  'sendFile',
  'transcribeAudio',
  'ocrImage',
  'translateText',
]);

// Handles de ENTRADA (target). Devuelve [] cuando el nodo no recibe entradas.
// trigger no tiene entrada.
export function inHandles(type) {
  if (type === 'trigger') return [];
  return [{ id: 'in', label: '' }];
}

// Handles de SALIDA (source). Devuelve [] cuando el nodo no emite salidas.
// - end: sin salida.
// - condition: 'true' / 'false'.
// - interactiveMenu: una salida por opción (`opt:<id>`) + 'out'.
// - integraciones: añaden 'onError'.
// - resto: 'out'.
export function outHandles(type, data = {}) {
  if (type === 'end') return [];

  if (type === 'condition') {
    return [
      { id: 'true', label: 'Sí' },
      { id: 'false', label: 'No' },
    ];
  }

  if (type === 'handover') {
    // Transfiere a humano; finaliza el flujo automatizado.
    return [];
  }

  if (type === 'interactiveMenu') {
    const options = Array.isArray(data.options) ? data.options : [];
    const optionHandles = options.map((opt) => ({
      id: `opt:${opt.id}`,
      label: opt.label || `Opción ${opt.id}`,
    }));
    return [...optionHandles, { id: 'out', label: 'Salida' }];
  }

  const handles = [{ id: 'out', label: '' }];
  if (ERROR_TYPES.has(type)) {
    handles.push({ id: 'onError', label: 'Error' });
  }
  return handles;
}
