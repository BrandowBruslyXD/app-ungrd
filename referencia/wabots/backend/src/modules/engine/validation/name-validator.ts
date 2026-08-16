import { normalizeText } from '../../../common/text/normalize';

/**
 * VALIDACIÓN DE NOMBRE (anti-bromas). Un nombre real:
 *  - solo letras/espacios/'-. (2 a 60 caracteres, al menos una vocal),
 *  - sin dígitos, urls ni repeticiones absurdas ("aaaa", "jajaja"),
 *  - y no está en la lista de nombres-broma/grosería conocidos.
 */

/**
 * Lista de bloqueo de nombres-broma. REGLA: solo debe contener entradas que
 * NUNCA son un nombre o apellido real de persona (personajes de ficción
 * inequívocos, placeholders, nombres artísticos que no son nombres legales,
 * términos de bot/IA e insultos). El costo de rechazar a un cliente legítimo
 * es mayor que el de dejar pasar una broma, por lo que ante la duda una
 * entrada NO se incluye.
 */
const NOMBRES_BROMA = new Set([
  // Superhéroes / personajes de ficción inequívocos
  'batman', 'superman', 'spiderman', 'hombre arana', 'ironman', 'iron man', 'hulk',
  'capitan america', 'wolverine', 'deadpool', 'flash', 'aquaman', 'goku',
  'vegeta', 'gohan', 'freezer', 'naruto', 'sasuke', 'pikachu', 'ash ketchum',
  'super mario', 'sonic', 'shrek', 'yoda', 'darth vader',
  'obi wan', 'harry potter', 'voldemort', 'hermione', 'gandalf', 'frodo',
  'mickey mouse', 'minnie mouse', 'pato donald', 'bob esponja',
  'calamardo', 'homero simpson', 'bart simpson',
  'lisa simpson', 'peter griffin', 'peter parker', 'bruce wayne',
  'la roca', 'el chavo', 'el chavo del ocho',
  'la chilindrina', 'doraemon', 'pokemon', 'pj mask', 'winnie pooh',
  'buzz lightyear', 'woody', 'peppa', 'peppa pig',
  // Nombres artísticos que no son nombres legales
  'bad bunny', 'karol g', 'j balvin', 'daddy yankee', 'maluma',
  // Placeholders / trolls técnicos
  'test', 'testing', 'prueba', 'pruebas', 'asdf', 'asdfg', 'asdfgh', 'qwerty',
  'aaa', 'aaaa', 'xd', 'xxx', 'zzz', 'sin nombre', 'no tengo', 'no tengo nombre',
  'ninguno', 'ninguna', 'nadie', 'anonimo', 'anonima', 'n/a', 'na', 'nada',
  'no se', 'no aplica', 'fulano', 'fulanito', 'mengano', 'zutano', 'perengano',
  'john doe', 'jane doe', 'el pepe',
  'pepito', 'pepito perez', 'juanito', 'juanito alimana', 'usuario', 'user',
  'cliente', 'el cliente', 'nombre', 'nombre apellido', 'apellido', 'don comedia',
  // Insultos/burlas comunes como nombre
  'tu mama', 'tu madre', 'su madre', 'tu papa', 'tu padre', 'tu abuela',
  'mi amor', 'amor', 'bebe', 'papi', 'papito', 'mami', 'mamita', 'jefe',
  'el jefe', 'el patron', 'patron', 'yo', 'yo mismo',
  // Religión / trolls varios
  'dios', 'jesucristo', 'satanas', 'lucifer', 'diablo',
  // Referencias a bot / IA
  'bot', 'robot', 'sos un robot', 'eres un bot', 'chatbot', 'ia',
  'inteligencia artificial', 'assistant', 'asistente', 'siri',
  'chatgpt', 'gpt', 'chat gpt', 'admin', 'administrador',
]);

// Raíces de groserías/sexuales/insultos (texto ya normalizado: minúsculas, sin acentos).
// Se usan raíces para cubrir variantes; se evitan raíces tan cortas que casen con nombres reales.
const GROSERIAS = /(mierd|puto|puta|verga|pendej|marica|gonorrea|malparid|hijueput|hijuep|\bhp\b|hij[a-z]* de puta|culo|culiao|culer|caca|pipi|popo|joder|carajo|cabron|cono|chinga|pinche|zorra|perra|imbecil|idiota|estupid|tarad|mamada|mamon|boludo|pelotud|forro|careverg|polla|\bpene\b|penetr|\bteta|follar|sexo|concha tu|conchetu)/i;

/** Valida que el texto parezca un nombre real de persona. */
export function validarNombre(raw: string): { ok: boolean; motivo?: string } {
  const t = raw.trim().replace(/\s+/g, ' ');
  const norm = normalizeText(t);
  if (t.length < 2 || t.length > 60) return { ok: false, motivo: 'longitud' };
  if (/\d/.test(t)) return { ok: false, motivo: 'contiene números' };
  if (/https?:\/\/|www\./i.test(t)) return { ok: false, motivo: 'contiene enlace' };
  if (!/^[a-záéíóúüñ' .-]+$/i.test(t)) return { ok: false, motivo: 'caracteres inválidos' };
  if (!/[aeiouáéíóú]/i.test(t)) return { ok: false, motivo: 'sin vocales' };
  // Repeticiones absurdas: misma letra 4+ veces seguidas, o risa ("jaja", "jeje").
  if (/(.)\1{3,}/i.test(norm)) return { ok: false, motivo: 'repetición' };
  if (/(ja|je|ji|jo|ha|he){2,}/i.test(norm)) return { ok: false, motivo: 'risa' };
  if (GROSERIAS.test(norm)) return { ok: false, motivo: 'lenguaje inapropiado' };
  if (NOMBRES_BROMA.has(norm)) return { ok: false, motivo: 'nombre no real' };
  // Cada palabra del nombre tampoco puede ser una broma conocida.
  const palabras = norm.split(' ');
  if (palabras.some((p) => NOMBRES_BROMA.has(p) && palabras.length === 1)) {
    return { ok: false, motivo: 'nombre no real' };
  }
  return { ok: true };
}

/** Formato mínimo de correo electrónico. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Teléfono: 7-15 dígitos (tolera +, espacios, guiones, paréntesis). */
export function validarTelefono(raw: string): boolean {
  const digits = raw.replace(/[\s()+.-]/g, '');
  return /^\d{7,15}$/.test(digits);
}

/** Título de Nombre Propio ("juan pérez" → "Juan Pérez"). */
export function titleCase(t: string): string {
  return t
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}
