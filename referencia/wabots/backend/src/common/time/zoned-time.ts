/**
 * Utilidades de zona horaria SIN dependencias externas (usa Intl, disponible
 * con el ICU completo de Node). Convertimos una fecha/hora "de pared" (naive,
 * tal como la escribió/entendió el cliente) en una zona IANA a un instante
 * absoluto (UTC), para poder programar recordatorios que disparen a la hora
 * correcta del negocio sin importar dónde corra el servidor.
 */

/**
 * Desfase (ms) de una zona IANA respecto de UTC en un instante dado.
 * Positivo si la zona va por delante de UTC (ej. Europe/Madrid), negativo
 * si va por detrás (ej. America/Bogota = -5h).
 */
export function tzOffsetMs(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(at);
    const map: Record<string, number> = {};
    for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value);
    // 'hour' puede venir como 24 a medianoche en algunas plataformas.
    const hour = map.hour === 24 ? 0 : map.hour;
    const asUtcWall = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
    return asUtcWall - at.getTime();
  } catch {
    return 0; // zona inválida → tratamos el naive como UTC
  }
}

/**
 * Interpreta un texto de fecha/hora naive ("YYYY-MM-DD HH:mm", con espacio o 'T',
 * segundos opcionales) como hora de pared en la zona `tz` y devuelve el instante
 * absoluto (Date UTC). Devuelve null si no se puede parsear.
 */
export function zonedNaiveToUtc(raw: string, tz: string): Date | null {
  if (!raw) return null;
  const m = String(raw)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    // Último intento: dejar que Date lo parsee (p.ej. ISO con offset explícito).
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const h = +m[4];
  const mi = +m[5];
  const s = m[6] ? +m[6] : 0;
  const naiveAsUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  // El offset en ese instante; para zonas de offset fijo (Bogotá) es exacto.
  const offset = tzOffsetMs(tz, new Date(naiveAsUtc));
  return new Date(naiveAsUtc - offset);
}
