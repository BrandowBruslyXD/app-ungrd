import { normalizeText } from '../../../common/text/normalize';

/** Meses en español (incluye la variante "setiembre"). */
const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Formatea a "YYYY-MM-DD HH:mm" (naive) que entiende el nodo Calendar. */
export const fmt = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Extrae la hora de frases naturales: "a las 4", "4pm", "16:00", "3:30 pm",
 * "3 de la tarde", "a las 5 y media", "mediodía", "medianoche", "15h".
 */
export function parseTime(t: string): { h: number; m: number } | null {
  let m: RegExpMatchArray | null;
  if (/\bmediodia\b/.test(t)) return { h: 12, m: 0 };
  if (/\bmedianoche\b/.test(t)) return { h: 0, m: 0 };

  // Indicadores de franja para desambiguar el formato de 12 horas.
  const pm = /\b(p\.?\s*m\.?|de la tarde|por la tarde|de la noche|por la noche)\b/.test(t);
  const am = /\b(a\.?\s*m\.?|de la manana|por la manana|de la madrugada)\b/.test(t);

  // HH:MM (con am/pm o franja opcional)
  if ((m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/))) {
    let h = +m[1];
    const mi = +m[2];
    if (h > 23 || mi > 59) return null;
    if ((m[3] === 'pm' || pm) && h < 12) h += 12;
    if ((m[3] === 'am' || am) && h === 12) h = 0;
    return { h, m: mi };
  }
  // "10 y 35 [pm]" / "a las 10 y 35" — hora "H y M" hablada. Va ANTES del
  // patrón "Npm" para que en "10 y 35 pm" no se capture "35 pm" como hora 35
  // (que desbordaba al día siguiente).
  if ((m = t.match(/\b(\d{1,2})\s*y\s*(\d{1,2})\b/))) {
    let h = +m[1];
    const mi = +m[2];
    if (h <= 23 && mi <= 59) {
      if (pm && h < 12) h += 12;
      if (am && h === 12) h = 0;
      return { h, m: mi };
    }
  }
  // "4pm" / "4 pm" (solo horas válidas de reloj de 12h)
  if ((m = t.match(/\b(\d{1,2})\s*(am|pm)\b/))) {
    let h = +m[1];
    if (h >= 1 && h <= 12) {
      if (m[2] === 'pm' && h < 12) h += 12;
      if (m[2] === 'am' && h === 12) h = 0;
      return { h, m: 0 };
    }
  }
  // "a las 5 [y media|y cuarto]"
  if ((m = t.match(/a\s*las?\s*(\d{1,2})(?:\s*y\s*(media|cuarto))?/))) {
    let h = +m[1];
    if (h > 23) return null;
    const mi = m[2] === 'media' ? 30 : m[2] === 'cuarto' ? 15 : 0;
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
    return { h, m: mi };
  }
  // "3 de la tarde/noche/mañana/madrugada"
  if ((m = t.match(/\b(\d{1,2})\s*(?:de la|por la)\s*(tarde|noche|manana|madrugada)\b/))) {
    let h = +m[1];
    if ((m[2] === 'tarde' || m[2] === 'noche') && h < 12) h += 12;
    return { h, m: 0 };
  }
  // "15h" / "15 horas"
  if ((m = t.match(/(\d{1,2})\s*h(?:oras?)?\b/))) {
    let h = +m[1];
    if (pm && h < 12) h += 12;
    return { h, m: 0 };
  }
  return null;
}

/**
 * Parser flexible de fechas en español. Acepta:
 *  - ISO "2026-07-15 15:00" / "2026-07-15"
 *  - "15/07[/2026]"
 *  - "hoy", "mañana", "pasado mañana"
 *  - "15 de julio [de 2026]"
 *  - "el 13 del otro mes" / "del próximo mes"
 *  - "el 15" / "este 15" / "para el 15" (este mes, o el próximo si ya pasó;
 *    requiere el artículo — un número suelto como "somos 5" NO es fecha)
 * Hora opcional ("3pm", "a las 4", "16:00"); si falta, usa 09:00.
 * Devuelve Date válido o null.
 */
export function parseSpanishDate(raw: string, now: Date): Date | null {
  const t = normalizeText(raw);
  const time = parseTime(t);
  const setTime = (d: Date) => {
    if (time) d.setHours(time.h, time.m, 0, 0);
    else d.setHours(9, 0, 0, 0);
    return d;
  };
  let m: RegExpMatchArray | null;
  const DIAS: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
  };

  // ISO "2026-07-15 [15:00]"
  if ((m = t.match(/(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{2}):(\d{2}))?/))) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : (time ? time.h : 9), m[5] ? +m[5] : (time ? time.m : 0), 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM[/YYYY]
  if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    let y = m[3] ? +m[3] : now.getFullYear();
    if (y < 100) y += 2000;
    return setTime(new Date(y, +m[2] - 1, +m[1]));
  }
  // Relativas inmediatas (ayer/anteayer se parsean para poder responder
  // "esa fecha ya pasó" en vez de un genérico "no entendí").
  if (/\bpasado\s*manana\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() + 2); return setTime(d); }
  if (/\banteayer\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() - 2); return setTime(d); }
  if (/\bayer\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() - 1); return setTime(d); }
  if (/\bmanana\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() + 1); return setTime(d); }
  if (/\bhoy\b/.test(t)) return setTime(new Date(now));
  // "en 3 dias" / "en una semana" / "en 2 semanas"
  if ((m = t.match(/\ben\s*(\d{1,2})\s*dias?\b/))) { const d = new Date(now); d.setDate(d.getDate() + +m[1]); return setTime(d); }
  if (/\ben\s*una\s*semana\b/.test(t)) { const d = new Date(now); d.setDate(d.getDate() + 7); return setTime(d); }
  if ((m = t.match(/\ben\s*(\d{1,2})\s*semanas?\b/))) { const d = new Date(now); d.setDate(d.getDate() + 7 * +m[1]); return setTime(d); }
  // Día de la semana: "el lunes", "proximo viernes", "este sabado" → próxima ocurrencia.
  if ((m = t.match(/\b(?:este|el|proximo|siguiente)?\s*(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/))) {
    const target = DIAS[m[1]];
    const d = new Date(now);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // si cae hoy, asume la próxima ocurrencia
    d.setDate(d.getDate() + diff);
    return setTime(d);
  }
  // "15 de julio [de 2026]"
  if ((m = t.match(/\b(\d{1,2})\s*de\s*([a-z]+)(?:\s*de\s*(\d{4}))?/))) {
    const mes = MESES[m[2]];
    if (mes) {
      const y = m[3] ? +m[3] : now.getFullYear();
      const d = new Date(y, mes - 1, +m[1]);
      if (!m[3] && d.getTime() < now.getTime()) d.setFullYear(y + 1);
      return setTime(d);
    }
  }
  // Mes con el número ANTES: "12 del proximo mes", "el dia 13 del otro mes"
  if ((m = t.match(/\b(?:el\s*dia\s*|el\s*)?(\d{1,2})\s*(?:del?\s*)?(otro|proximo|siguiente)\s*mes/))) {
    return setTime(new Date(now.getFullYear(), now.getMonth() + 1, +m[1]));
  }
  // Mes actual con número: "el dia 20 de este mes"
  if ((m = t.match(/\b(?:el\s*dia\s*|el\s*)?(\d{1,2})\s*(?:del?\s*)?este\s*mes/))) {
    return setTime(new Date(now.getFullYear(), now.getMonth(), +m[1]));
  }
  // Mes con el número DESPUÉS: "el proximo mes el dia 12"
  if ((m = t.match(/(?:otro|proximo|siguiente)\s*mes\D*?(\d{1,2})/))) {
    return setTime(new Date(now.getFullYear(), now.getMonth() + 1, +m[1]));
  }
  if ((m = t.match(/este\s*mes\D*?(\d{1,2})/))) {
    return setTime(new Date(now.getFullYear(), now.getMonth(), +m[1]));
  }
  // "el 25" / "este 25" / "para el 25" → este mes, o el próximo si ya pasó.
  // Exige el artículo como contexto de fecha, o bien que el mensaje COMPLETO
  // sea solo el número (respuesta directa a "¿qué día?"). Un número dentro de
  // otra frase ("somos 5", "5 personas") no se interpreta como día del mes.
  if ((m = t.match(/\b(?:para\s+el|el|este)\s+(\d{1,2})\b/) ?? t.match(/^(\d{1,2})$/))) {
    const day = +m[1];
    if (day >= 1 && day <= 31) {
      let d = new Date(now.getFullYear(), now.getMonth(), day);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (d.getTime() < today.getTime()) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
      return setTime(d);
    }
  }
  return null;
}
