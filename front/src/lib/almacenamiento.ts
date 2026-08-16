/**
 * Almacenamiento local de reportes y censos.
 *
 * Por qué existe: hasta ahora los formularios terminaban en un `setTimeout` de
 * 1,5 segundos y el dato se perdía. Un brigadista podía llenar seis pasos de
 * censo, con nombres y documentos de una familia entera, y quedarse sin nada.
 *
 * Por qué en `localStorage` y no contra la API: el backend todavía no expone
 * endpoints de EDAN ni de censo. Pero además, guardar primero en el dispositivo
 * es lo correcto en este dominio, no un parche — el censo se levanta casa por
 * casa en veredas donde no hay señal (`docs/SISTEMA-REPORTES-COLOMBIA.md`, §9.2
 * punto 7). Cuando existan los endpoints, esto se vuelve la cola de salida y lo
 * único que cambia es quién lee `listarPendientes`.
 */

const CLAVE = 'conectariesgo.registros.v1';

export type TipoRegistro = 'reporte' | 'censo' | 'incidente' | 'habitabilidad';

export interface RegistroGuardado<T> {
  codigo: string;
  tipo: TipoRegistro;
  datos: T;
  /** ISO-8601 en UTC, igual que el backend. */
  creadoEn: string;
  /** Mientras sea `false`, el registro solo existe en este teléfono. */
  sincronizado: boolean;
}

/*
 * Alfabeto sin caracteres que se confunden al dictar por teléfono o al leer una
 * pantalla rayada: fuera I, O, S, B y los dígitos 0, 1, 2, 5, 8. Es el mismo
 * criterio que ya usa `servicios/ms-bot-api`, para que un código generado aquí y
 * uno generado por el bot se lean igual.
 */
const ALFABETO = 'ACDEFGHJKLMNPQRTUVWXY34679';

const PREFIJOS: Record<TipoRegistro, string> = {
  reporte: 'RPT',
  censo: 'EDAN',
  incidente: 'INC',
  habitabilidad: 'HAB',
};

function sufijoAleatorio(largo = 4): string {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

function leerTodo(): RegistroGuardado<unknown>[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) {
      return [];
    }
    const analizado: unknown = JSON.parse(crudo);
    return Array.isArray(analizado) ? (analizado as RegistroGuardado<unknown>[]) : [];
  } catch {
    // Modo privado de Safari, almacenamiento deshabilitado o JSON corrupto.
    // Se arranca vacío en vez de tumbar la pantalla: perder el historial es
    // malo, no poder reportar es peor.
    return [];
  }
}

function escribirTodo(registros: RegistroGuardado<unknown>[]): boolean {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(registros));
    return true;
  } catch {
    return false;
  }
}

/**
 * Genera el código que ve la persona: `RPT-2026-08-16-0007-K7M4`.
 *
 * El consecutivo sirve para ordenar y contar; el sufijo aleatorio evita que el
 * código sea adivinable, porque la consulta por código es pública por diseño
 * —funciona como número de guía— y sin él cualquiera podría recorrer 0001, 0002
 * y leer los datos de reportes ajenos.
 */
function generarCodigo(tipo: TipoRegistro, consecutivo: number): string {
  const hoy = new Date().toISOString().slice(0, 10);
  return `${PREFIJOS[tipo]}-${hoy}-${String(consecutivo).padStart(4, '0')}-${sufijoAleatorio()}`;
}

export interface ResultadoGuardado<T> {
  registro: RegistroGuardado<T>;
  /** `false` si el navegador no dejó escribir: el dato vive solo en memoria. */
  persistido: boolean;
}

/** Guarda un registro y devuelve su código de seguimiento. */
export function guardarRegistro<T>(tipo: TipoRegistro, datos: T): ResultadoGuardado<T> {
  const todos = leerTodo();
  const consecutivo = todos.filter((r) => r.tipo === tipo).length + 1;

  const registro: RegistroGuardado<T> = {
    codigo: generarCodigo(tipo, consecutivo),
    tipo,
    datos,
    creadoEn: new Date().toISOString(),
    sincronizado: false,
  };

  const persistido = escribirTodo([...todos, registro as RegistroGuardado<unknown>]);
  return { registro, persistido };
}

/** Devuelve los registros de un tipo, del más reciente al más antiguo. */
export function listarRegistros<T>(tipo: TipoRegistro): RegistroGuardado<T>[] {
  return leerTodo()
    .filter((r): r is RegistroGuardado<T> => r.tipo === tipo)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

/** Cuántos registros siguen solo en este dispositivo. */
export function contarPendientes(tipo?: TipoRegistro): number {
  return leerTodo().filter((r) => !r.sincronizado && (!tipo || r.tipo === tipo)).length;
}

/** Marca un registro como ya entregado al servidor. */
export function marcarSincronizado(codigo: string): void {
  const todos = leerTodo();
  const indice = todos.findIndex((r) => r.codigo === codigo);
  if (indice === -1) {
    return;
  }
  todos[indice] = { ...todos[indice], sincronizado: true };
  escribirTodo(todos);
}

/** Borra todo. Solo para pruebas y para el botón de reiniciar la demo. */
export function limpiarRegistros(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    // Si no se puede borrar, tampoco se pudo escribir. No hay nada que hacer.
  }
}
