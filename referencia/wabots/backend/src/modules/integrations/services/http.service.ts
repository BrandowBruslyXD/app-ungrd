import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import axios, { Method } from 'axios';

/** ¿La IP pertenece a un rango privado, loopback, link-local o CGNAT? */
function isPrivateAddress(ip: string): boolean {
  const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local (incl. metadata 169.254.169.254)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const v6 = normalized.toLowerCase();
  return (
    v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
  );
}

/**
 * Hosts internos permitidos explícitamente, separados por comas en
 * `HTTP_NODE_ALLOWED_HOSTS` (p.ej. "demo-api,erp.interno").
 *
 * El anti-SSRF rechaza cualquier destino que resuelva a una IP privada, y eso deja
 * al nodo httpRequest sin poder llamar a servicios del propio stack ni a sistemas
 * internos del cliente (un ERP, un servicio de inventario). Esta lista es la
 * excepción: la decide el administrador del servidor, nunca el contenido de un flujo.
 */
const ALLOWED_INTERNAL_HOSTS = (process.env.HTTP_NODE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/** ¿El host está en la lista blanca de destinos internos permitidos? */
export function isAllowedInternalHost(rawUrl: string): boolean {
  try {
    return ALLOWED_INTERNAL_HOSTS.includes(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Anti-SSRF reutilizable: rechaza URLs no http(s) o que resuelvan a rangos de
 * red internos, salvo los hosts de `HTTP_NODE_ALLOWED_HOSTS`. Debe invocarse antes
 * de CUALQUIER request saliente hacia una URL que pueda venir del usuario.
 */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Solo se permiten URLs http(s)');
  }
  const host = url.hostname;
  // Destino interno autorizado por configuración del servidor: se salta la comprobación.
  if (ALLOWED_INTERNAL_HOSTS.includes(host.toLowerCase())) return;
  const candidates = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((entry) => entry.address);
  if (candidates.length === 0 || candidates.some((ip) => isPrivateAddress(ip))) {
    throw new Error('Destino no permitido (dirección interna)');
  }
}

/** Parámetros de una petición HTTP genérica (nodo httpRequest). */
export interface HttpRequestParams {
  method?: Method | string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Servicio HTTP genérico para el nodo `httpRequest`. Solo alcanza destinos
 * públicos: valida el esquema, resuelve el host y rechaza IPs privadas,
 * loopback y link-local (protección anti-SSRF), y no sigue redirecciones.
 */
@Injectable()
export class HttpRequestService {
  private readonly logger = new Logger(HttpRequestService.name);

  async request(params: HttpRequestParams): Promise<{ status: number; data: any }> {
    if (!params?.url) {
      throw new Error('La petición HTTP requiere una url');
    }
    await assertPublicUrl(params.url);

    try {
      const res = await axios.request({
        method: (params.method ?? 'GET') as Method,
        url: params.url,
        headers: params.headers,
        data: params.body,
        // Configurable: APIs de terceros lentas se acomodan por env.
        timeout: Math.max(3000, Number(process.env.HTTP_NODE_TIMEOUT_MS ?? 20000)),
        maxRedirects: 0, // evita SSRF por redirección a hosts internos
        // No lanzar por 4xx/5xx: devolvemos el status para que el motor decida.
        validateStatus: () => true,
      });
      return { status: res.status, data: res.data };
    } catch (err) {
      this.logger.error(`request(${params.url}) falló: ${this.msg(err)}`);
      return { status: 0, data: { error: this.msg(err) } };
    }
  }

  private msg(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return `${err.response?.status ?? ''} ${JSON.stringify(
        err.response?.data ?? err.message,
      )}`;
    }
    return err instanceof Error ? err.message : String(err);
  }
}
