import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { FlowGraph } from '../../common/types/engine.types';
import { FlowsService } from '../flows/flows.service';
import { EngineService } from './engine.service';
import { PreviewMediaService } from './services/preview-media.service';

/** Topes de seguridad para las simulaciones (anti-DoS por payload). */
const MAX_SIM_NODES = 300;
const MAX_SIM_EDGES = 600;
const MAX_SIM_MESSAGE = 4000;

/**
 * Adjuntos aceptados en la vista previa: CUALQUIER audio (ffmpeg decodifica
 * prácticamente todos los formatos) y CUALQUIER imagen (tesseract lee los
 * formatos comunes). PDF/Word/video NO se procesan (en producción el bot
 * pide el dato por texto).
 */
const MAX_MEDIA_BYTES = 8 * 1024 * 1024; // 8 MB

/** Adjunto de prueba tal como llega del editor. */
interface SimMedia {
  base64: string;
  mimeType: string;
  kind: 'audio' | 'image';
}

/**
 * Endpoint de simulación de flujos: prueba un bot en seco (sin Evolution).
 * POST /api/flows/:id/simulate  { message, state? }
 */
@Controller('flows')
export class EngineController {
  constructor(
    private readonly flows: FlowsService,
    private readonly engine: EngineService,
    private readonly previewMedia: PreviewMediaService,
  ) {}

  /**
   * Guarda el adjunto en su rama del árbol auditable (empresa/flujo/_pruebas)
   * y devuelve la ruta relativa, para poder reproducirlo/validarlo después.
   * El audio se convierte a OGG/Opus (liviano) dentro del servicio.
   */
  private async persistMedia(
    media: SimMedia | undefined,
    ctx: { tenantId?: string; flowId?: string },
  ): Promise<string | null> {
    if (!media) return null;
    return this.previewMedia.save(Buffer.from(media.base64, 'base64'), media.mimeType, ctx);
  }

  /** Valida tamaño del mensaje y del grafo antes de simular (anti-abuso). */
  private guard(message: string, graph?: FlowGraph): void {
    if (typeof message === 'string' && message.length > MAX_SIM_MESSAGE) {
      throw new BadRequestException('El mensaje es demasiado largo.');
    }
    if (graph) {
      const nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
      const edges = Array.isArray(graph.edges) ? graph.edges.length : 0;
      if (nodes > MAX_SIM_NODES || edges > MAX_SIM_EDGES) {
        throw new BadRequestException('El flujo es demasiado grande para simular.');
      }
    }
  }

  /**
   * Valida y normaliza el adjunto de prueba. Devuelve undefined si no viene.
   * Rechaza con mensaje claro los formatos no soportados y los tamaños excesivos.
   */
  private guardMedia(media: unknown): SimMedia | undefined {
    if (!media || typeof media !== 'object') return undefined;
    const m = media as Record<string, any>;
    const kind = m.kind === 'audio' || m.kind === 'image' ? (m.kind as 'audio' | 'image') : null;
    const base64 = typeof m.base64 === 'string' ? m.base64 : '';
    const mimeType = typeof m.mimeType === 'string' ? m.mimeType.split(';')[0].trim().toLowerCase() : '';
    if (!kind || !base64 || !mimeType) {
      throw new BadRequestException('Adjunto de prueba incompleto (kind, mimeType y base64 son obligatorios).');
    }
    if (!mimeType.startsWith(`${kind}/`)) {
      throw new BadRequestException(
        'Solo se aceptan audios e imágenes. Los PDF/documentos y videos no se procesan.',
      );
    }
    // Tamaño aproximado del binario (base64 ≈ 4/3 del original).
    const bytes = Math.floor(base64.length * 0.75);
    if (bytes > MAX_MEDIA_BYTES) {
      throw new BadRequestException('El adjunto supera el máximo de 8 MB.');
    }
    return { base64, mimeType, kind };
  }

  // Throttle estricto: la simulación dispara IA/red; limita ráfagas por IP.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post(':id/simulate')
  async simulate(
    @Param('id') id: string,
    @Body() body: {
      message: string;
      state?: { variables?: Record<string, any>; currentNodeId?: string | null };
      media?: SimMedia;
    },
  ) {
    this.guard(body?.message ?? '');
    const media = this.guardMedia(body?.media);
    const flow = await this.flows.findOne(id);
    const mediaFile = await this.persistMedia(media, {
      tenantId: flow.tenantId ?? undefined,
      flowId: flow.id,
    });
    const data = await this.engine.simulate(
      flow.graph as FlowGraph,
      body?.message ?? '',
      body?.state,
      // dryRun: probar nunca crea citas/correos reales. tenantId real: el
      // consumo de IA de la prueba se registra como uso de la empresa dueña.
      { dryRun: true, tenantId: flow.tenantId ?? undefined, media },
    );
    return { data: { ...data, ...(mediaFile ? { mediaFile } : {}) } };
  }

  /**
   * Simula un grafo ENVIADO en el cuerpo (sin necesidad de guardarlo). Lo usa el
   * "probador" del editor para previsualizar en vivo los cambios sin persistir.
   * POST /api/flows/simulate-graph  { graph, message, state? }
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('simulate-graph')
  async simulateGraph(
    @Body()
    body: {
      graph: FlowGraph;
      message: string;
      state?: { variables?: Record<string, any>; currentNodeId?: string | null };
      /** Empresa dueña del flujo en edición (mide el consumo de la prueba). */
      tenantId?: string;
      /** Flujo en edición (ubica los adjuntos en su rama del árbol). */
      flowId?: string;
      /** Adjunto de prueba (nota de voz/imagen) para transcripción/OCR. */
      media?: SimMedia;
    },
  ) {
    this.guard(body?.message ?? '', body?.graph);
    const media = this.guardMedia(body?.media);
    const mediaFile = await this.persistMedia(media, {
      tenantId: typeof body?.tenantId === 'string' && body.tenantId ? body.tenantId : undefined,
      flowId: typeof body?.flowId === 'string' && body.flowId ? body.flowId : undefined,
    });
    const data = await this.engine.simulate(
      body?.graph ?? { nodes: [], edges: [] },
      body?.message ?? '',
      body?.state,
      // dryRun: la vista previa nunca crea citas/correos reales.
      {
        dryRun: true,
        tenantId: typeof body?.tenantId === 'string' && body.tenantId ? body.tenantId : undefined,
        media,
      },
    );
    return { data: { ...data, ...(mediaFile ? { mediaFile } : {}) } };
  }
}
