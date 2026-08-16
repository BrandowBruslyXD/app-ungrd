import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import type { Response } from 'express';
import { createReadStream, promises as fs } from 'fs';

import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PreviewMediaService } from './services/preview-media.service';

/** Content-Type por extensión para servir los adjuntos guardados. */
const MIME_BY_EXT: Record<string, string> = {
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  aac: 'audio/aac',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Auditoría de adjuntos guardados (bajo JwtAuthGuard global). Las rutas son
 * relativas al árbol empresas/<tenant>/<flujo>/<usuario>:
 *  - GET    /admin/preview-media              → lista recursiva de lo guardado.
 *  - GET    /admin/preview-media/item?path=…  → descarga/reproduce un adjunto.
 *  - DELETE /admin/preview-media              → limpia todo el árbol.
 */
@Controller('admin/preview-media')
export class PreviewMediaController {
  constructor(private readonly media: PreviewMediaService) {}

  @Get()
  async list() {
    return { data: await this.media.list() };
  }

  // Sirve el adjunto por STREAMING (no carga el archivo entero en memoria).
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('item')
  async serve(@Query('path') relPath: string, @Res() res: Response) {
    const path = this.media.resolvePath(relPath ?? '');
    if (!path) throw new NotFoundException('Adjunto no encontrado.');
    // Verifica la existencia ANTES de enviar headers (404 JSON como antes).
    try {
      const info = await fs.stat(path);
      if (!info.isFile()) throw new Error('no es un archivo regular');
    } catch {
      throw new NotFoundException('Adjunto no encontrado.');
    }
    const ext = relPath.split('.').pop()?.toLowerCase() ?? '';
    res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = createReadStream(path);
    stream.on('error', () => {
      // Carrera improbable (borrado tras el stat): 404 si aún no se envió
      // nada; si ya se estaba transmitiendo, se corta la conexión.
      if (!res.headersSent) {
        res.status(404).json({ statusCode: 404, message: 'Adjunto no encontrado.' });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  }

  // Borrado individual y masivo: acciones destructivas sobre TODAS las empresas
  // → exigen SUPERADMIN (coherente con ai-admin/service-account).
  @Roles(AdminRole.SUPERADMIN)
  @Delete('item')
  async removeOne(@Query('path') relPath: string) {
    const ok = await this.media.remove(relPath ?? '');
    if (!ok) throw new NotFoundException('Adjunto no encontrado.');
    return { data: { removed: 1 } };
  }

  @Roles(AdminRole.SUPERADMIN)
  @Delete()
  async clear() {
    const removed = await this.media.clear();
    return { data: { removed } };
  }
}

/**
 * Media archivada de UNA empresa (aislada por tenant), asociada en BD:
 * GET /tenants/:tenantId/media[?conversationId=…] → lista para el dashboard.
 */
@Controller('tenants/:tenantId/media')
export class TenantMediaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const data = await this.prisma.mediaFile.findMany({
      where: { tenantId, ...(conversationId ? { conversationId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return { data };
  }
}
