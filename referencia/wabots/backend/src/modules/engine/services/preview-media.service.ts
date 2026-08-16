import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join, posix, resolve, sep } from 'path';

import { PrismaService } from '../../../common/prisma/prisma.service';

/** Extensión de archivo por MIME (fallback: bin). */
const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Segmento de ruta seguro. El regex por sí solo NO basta: `.` y `..` también
 * lo cumplen (la clase incluye el punto) y permitirían traversal. Se validan
 * aparte de forma explícita.
 */
const SEGMENT_CHARS = /^[\w.-]+$/;
function isSafeSegment(s: string): boolean {
  return SEGMENT_CHARS.test(s) && s !== '.' && s !== '..';
}

/** Retención automática: los archivos caducan a los 7 días. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Contexto de origen del adjunto, para ubicarlo en la rama correcta. */
export interface MediaContext {
  /** Empresa dueña del flujo (o undefined si el flujo no está asociado). */
  tenantId?: string;
  /** Flujo al que pertenece (o undefined si es un borrador sin guardar). */
  flowId?: string;
  /** Teléfono del usuario final; undefined/'sim' = prueba del editor. */
  contactPhone?: string;
  /** Conversación asociada (mensajes reales), para vincular en el dashboard. */
  conversationId?: string;
}

/**
 * Almacén de adjuntos (audios/imágenes) organizado en ramas por origen:
 *
 *   empresas/<tenantId>/<flowId>/<telefono>/  → media de usuarios reales
 *   empresas/<tenantId>/<flowId>/_pruebas/    → pruebas del editor (flujo de empresa)
 *   sin-empresa/<flowId|_borrador>/_pruebas/  → flujos aún no asociados a empresa
 *
 * El audio se CONVIERTE a OGG/Opus 32 kbps mono (formato liviano de nota de
 * voz, el mismo enfoque de WhatsApp) antes de guardarse; las imágenes se
 * guardan tal cual (ya vienen comprimidas). La raíz vive montada en el host
 * para limpieza manual, y se auto-depura a los 7 días.
 */
@Injectable()
export class PreviewMediaService {
  private readonly logger = new Logger(PreviewMediaService.name);
  private readonly dir = process.env.PREVIEW_MEDIA_DIR || '/app/media';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda el adjunto en su rama y devuelve la ruta RELATIVA (o null si falla).
   * El audio se transcodifica a OGG/Opus; si la conversión falla se guarda el
   * original (mejor conservar la evidencia que perderla).
   */
  async save(buffer: Buffer, mimeType: string, ctx: MediaContext = {}): Promise<string | null> {
    try {
      let data = buffer;
      let ext = EXT_BY_MIME[mimeType] || (mimeType.startsWith('image/') ? 'img' : 'bin');

      if (mimeType.startsWith('audio/') && ext !== 'ogg') {
        try {
          data = await this.toOpus(buffer);
          ext = 'ogg';
        } catch (err) {
          this.logger.warn(`Conversión a Opus falló; se guarda el original: ${(err as Error).message}`);
        }
      }

      const branch = this.branchFor(ctx);
      const absDir = join(this.dir, ...branch.split('/'));
      await fs.mkdir(absDir, { recursive: true });

      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const name = `${stamp}_${randomBytes(3).toString('hex')}.${ext}`;
      await fs.writeFile(join(absDir, name), data);

      const relPath = posix.join(branch, name);
      // Asociación en base de datos: permite listar/gestionar los archivos
      // desde el dashboard por empresa/conversación. Best-effort.
      const isPreview = !ctx.contactPhone || ctx.contactPhone === 'sim';
      await this.prisma.mediaFile
        .create({
          data: {
            tenantId: ctx.tenantId ?? null,
            flowId: ctx.flowId ?? null,
            conversationId: ctx.conversationId ?? null,
            contactPhone: isPreview ? null : ctx.contactPhone ?? null,
            kind: mimeType.startsWith('audio/') ? 'audio' : 'image',
            mimeType: ext === 'ogg' ? 'audio/ogg' : mimeType,
            path: relPath,
            bytes: data.length,
            origin: isPreview ? 'prueba' : 'real',
          },
        })
        .catch((err) => this.logger.warn(`No se pudo registrar el adjunto en BD: ${err?.message}`));

      void this.pruneOld();
      return relPath;
    } catch (err) {
      // El guardado es auditoría: nunca debe romper la simulación/conversación.
      this.logger.warn(`No se pudo guardar el adjunto: ${(err as Error).message}`);
      return null;
    }
  }

  /** Elimina UN adjunto (archivo físico + registro en BD). */
  async remove(relPath: string): Promise<boolean> {
    const abs = this.resolvePath(relPath);
    if (!abs) return false;
    await fs.unlink(abs).catch(() => undefined);
    await this.prisma.mediaFile.deleteMany({ where: { path: relPath } }).catch(() => undefined);
    return true;
  }

  /** Rama de carpetas según el origen (empresa/flujo/usuario). */
  private branchFor(ctx: MediaContext): string {
    const seg = (v: string | undefined, fallback: string) =>
      v && isSafeSegment(v) ? v : fallback;
    const flow = seg(ctx.flowId, '_borrador');
    const isPreview = !ctx.contactPhone || ctx.contactPhone === 'sim';
    const user = isPreview ? '_pruebas' : seg(ctx.contactPhone, '_pruebas');
    return ctx.tenantId
      ? posix.join('empresas', seg(ctx.tenantId, '_desconocida'), flow, user)
      : posix.join('sin-empresa', flow, user);
  }

  /** Convierte cualquier audio a OGG/Opus 32 kbps mono (nota de voz liviana). */
  private toOpus(input: Buffer): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegPath: string = require('ffmpeg-static');
    if (!ffmpegPath) return Promise.reject(new Error('ffmpeg-static no disponible.'));

    return new Promise<Buffer>((resolve, reject) => {
      const args = [
        '-hide_banner', '-loglevel', 'error',
        '-i', 'pipe:0',
        '-ac', '1', '-c:a', 'libopus', '-b:a', '32k',
        '-f', 'ogg', 'pipe:1',
      ];
      const proc = spawn(ffmpegPath, args);
      const chunks: Buffer[] = [];
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('ffmpeg excedió el tiempo límite al convertir.'));
      }, 60000);

      proc.stdout.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(`ffmpeg (${code}): ${stderr.slice(0, 300)}`));
        const out = Buffer.concat(chunks);
        if (out.length === 0) return reject(new Error('Conversión vacía.'));
        resolve(out);
      });
      proc.stdin.on('error', () => { /* EPIPE si ffmpeg cierra antes */ });
      proc.stdin.write(input);
      proc.stdin.end();
    });
  }

  /** Lista recursiva de adjuntos (ruta relativa, más recientes primero). */
  async list(): Promise<{ path: string; bytes: number; createdAt: Date }[]> {
    const out: { path: string; bytes: number; createdAt: Date }[] = [];
    const walk = async (rel: string): Promise<void> => {
      const abs = rel ? join(this.dir, ...rel.split('/')) : this.dir;
      let entries;
      try {
        entries = await fs.readdir(abs, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (!isSafeSegment(e.name)) continue;
        const childRel = rel ? posix.join(rel, e.name) : e.name;
        if (e.isDirectory()) await walk(childRel);
        else {
          const st = await fs.stat(join(abs, e.name));
          out.push({ path: childRel, bytes: st.size, createdAt: st.mtime });
        }
      }
    };
    await walk('');
    return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Ruta absoluta de un adjunto. Doble barrera anti-traversal: (1) cada
   * segmento debe ser seguro y NO ser '.'/'..'; (2) la ruta resuelta debe
   * quedar DENTRO de la carpeta base (defensa en profundidad).
   */
  resolvePath(relPath: string): string | null {
    const segments = String(relPath).split(/[/\\]/).filter(Boolean);
    if (segments.length === 0) return null;
    if (!segments.every(isSafeSegment)) return null;
    const abs = resolve(this.dir, ...segments);
    const root = resolve(this.dir);
    if (abs !== root && !abs.startsWith(root + sep)) return null;
    return abs;
  }

  /** Elimina TODOS los adjuntos guardados (disco + BD). Devuelve cuántos borró. */
  async clear(): Promise<number> {
    const items = await this.list();
    for (const i of items) {
      const abs = this.resolvePath(i.path);
      if (abs) await fs.unlink(abs).catch(() => undefined);
    }
    await this.prisma.mediaFile.deleteMany({}).catch(() => undefined);
    return items.length;
  }

  /** Depuración automática: borra adjuntos (disco + BD) con más de 7 días. */
  private async pruneOld(): Promise<void> {
    try {
      const limit = Date.now() - MAX_AGE_MS;
      const items = await this.list();
      for (const i of items) {
        if (i.createdAt.getTime() < limit) {
          const abs = this.resolvePath(i.path);
          if (abs) await fs.unlink(abs).catch(() => undefined);
          await this.prisma.mediaFile
            .deleteMany({ where: { path: i.path } })
            .catch(() => undefined);
        }
      }
    } catch {
      /* best-effort */
    }
  }
}
