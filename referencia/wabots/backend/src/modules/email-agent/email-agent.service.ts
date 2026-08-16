import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegrationType, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

/** Resultado de la clasificación del correo por el LLM. */
interface ClasificacionCorreo {
  intent: 'agendar' | 'responder' | 'ignorar';
  fecha: string | null;
  resumen: string;
  respuesta: string;
}

// Prompt de clasificación por defecto (se puede sobreescribir por tenant con
// config.systemPrompt). Exige responder SOLO un JSON con la forma esperada.
const DEFAULT_SYSTEM_PROMPT = [
  'Eres un asistente que analiza correos electrónicos entrantes.',
  'Decide qué hacer con el correo y responde SOLO con un objeto JSON válido,',
  'sin texto adicional ni explicaciones, con EXACTAMENTE estas claves:',
  '{',
  '  "intent": "agendar" | "responder" | "ignorar",',
  '  "fecha": "YYYY-MM-DD HH:mm" o null,',
  '  "resumen": "breve resumen del correo o del evento a agendar",',
  '  "respuesta": "texto de la respuesta al remitente (vacío si no aplica)"',
  '}',
  'Usa "agendar" si el correo pide o implica una cita/reunión con fecha y hora.',
  'Usa "responder" si conviene contestar al remitente.',
  'Usa "ignorar" para spam, notificaciones o correos sin acción.',
  'La zona horaria de referencia es America/Bogota.',
  'La "respuesta" debe sonar a una persona del equipo del negocio: cordial,',
  'breve y natural. NUNCA menciones que eres un sistema automático, una IA o',
  'un asistente virtual, ni tecnologías de ningún tipo.',
].join('\n');

const TIMEZONE = 'America/Bogota';
const DURACION_MIN = 60;

// Tope del cuerpo del correo enviado al LLM: los hilos largos disparan el
// consumo de tokens sin aportar a la clasificación.
const MAX_BODY_CHARS = 6000;

/**
 * AGENTE DE CORREO (poller). Cada 5 minutos revisa los correos no leídos de los
 * tenants ACTIVE que tengan Gmail conectado Y el agente habilitado
 * (config.agentEnabled === true en su Integration GMAIL). Por cada correo:
 *  - Lo clasifica con el LLM (intent: agendar | responder | ignorar).
 *  - Si 'agendar' y hay fecha → crea un evento en Google Calendar.
 *  - Si 'responder' y autoReply → contesta el correo.
 *  - Marca el correo como leído (quita 'UNREAD') para no reprocesarlo.
 *
 * TOLERANTE A FALLOS: try/catch por tenant y por correo; nunca tumba el proceso.
 * DESHABILITADO POR DEFECTO: si ningún tenant tiene agentEnabled, no hace nada.
 */
@Injectable()
export class EmailAgentService {
  private readonly logger = new Logger(EmailAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  /** Ejecuta el ciclo de revisión de correos cada 5 minutos. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollAll(): Promise<void> {
    let integraciones;
    try {
      // Busca integraciones GMAIL activas de tenants ACTIVE con agente habilitado.
      integraciones = await this.prisma.integration.findMany({
        where: {
          type: IntegrationType.GMAIL,
          isActive: true,
          tenantId: { not: null },
          tenant: { status: TenantStatus.ACTIVE },
        },
      });
    } catch (err) {
      this.logger.warn(`pollAll(): no se pudieron cargar integraciones: ${this.msg(err)}`);
      return;
    }

    // Filtra por agentEnabled en la config (campo en claro).
    const habilitadas = integraciones.filter((i) => {
      const config = (i.config ?? {}) as Record<string, any>;
      return config.agentEnabled === true;
    });

    if (!habilitadas.length) return; // Silencioso: nada habilitado.

    this.logger.log(`Agente de correo: procesando ${habilitadas.length} tenant(s).`);

    for (const integracion of habilitadas) {
      try {
        await this.procesarTenant(integracion);
      } catch (err) {
        this.logger.warn(
          `Agente de correo falló para tenant ${integracion.tenantId}: ${this.msg(err)}`,
        );
        if (integracion.tenantId) {
          await this.registrarEvento(integracion.tenantId, 'ERROR', 'Agente de correo falló', {
            error: this.msg(err),
          });
        }
      }
    }
  }

  // ───────────────────────────── Internos ─────────────────────────────

  /** Procesa los correos no leídos de un tenant. */
  private async procesarTenant(integracion: {
    id: string;
    tenantId: string | null;
    config: any;
  }): Promise<void> {
    const tenantId = integracion.tenantId as string;
    const config = (integracion.config ?? {}) as Record<string, any>;
    const systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const calendarId = config.calendarId;
    const autoReply = config.autoReply === true;

    // 1) Listar ids de correos no leídos (máx 5 por ciclo).
    const ids: string[] = await this.integrations.runForEngine(integracion.id, {
      kind: 'gmail',
      action: 'list',
      query: 'is:unread',
      maxResults: 5,
    });

    if (!ids?.length) return;

    for (const id of ids) {
      try {
        await this.procesarCorreo(integracion.id, tenantId, id, {
          systemPrompt,
          calendarId,
          autoReply,
        });
      } catch (err) {
        this.logger.warn(
          `Correo ${id} (tenant ${tenantId}) falló: ${this.msg(err)}`,
        );
        await this.registrarEvento(tenantId, 'ERROR', 'Fallo procesando correo', {
          correoId: id,
          error: this.msg(err),
        });
      }
    }
  }

  /** Procesa un único correo: clasifica, actúa y marca como leído. */
  private async procesarCorreo(
    integrationId: string,
    tenantId: string,
    id: string,
    opciones: { systemPrompt: string; calendarId?: string; autoReply: boolean },
  ): Promise<void> {
    // 2) Obtener el contenido del correo.
    const correo = await this.integrations.runForEngine(integrationId, {
      kind: 'gmail',
      action: 'get',
      id,
    });

    // 3) Clasificar con el LLM de PLATAFORMA (source 'platform', siempre).
    // El cuerpo se trunca: un hilo largo no mejora la clasificación y sí
    // multiplica los tokens de entrada.
    const cuerpo = String(correo.body ?? correo.snippet ?? '').slice(0, MAX_BODY_CHARS);
    const userText = `Asunto: ${correo.subject ?? ''}\n\nCuerpo:\n${cuerpo}`;

    const aiResult = await this.integrations.runForEngine('', {
      kind: 'ai',
      source: 'platform',
      tenantId,
      systemPrompt: opciones.systemPrompt,
      userText,
    });

    const clasificacion = this.parseClasificacion(aiResult?.reply ?? '');
    if (!clasificacion) {
      this.logger.warn(`No se pudo clasificar el correo ${id}; se ignora.`);
      await this.registrarEvento(tenantId, 'WARN', 'Correo sin clasificar (se ignora)', {
        correoId: id,
      });
      // Igual lo marcamos como leído para no reprocesarlo en bucle.
      await this.marcarLeido(integrationId, id);
      return;
    }

    // 4) Actuar según el intent.
    if (clasificacion.intent === 'agendar' && clasificacion.fecha) {
      await this.integrations.runForEngine('', {
        kind: 'calendar',
        source: 'platform',
        tenantId,
        action: 'createEvent',
        summary: clasificacion.resumen || correo.subject || 'Cita',
        start: clasificacion.fecha,
        durationMin: DURACION_MIN,
        timezone: TIMEZONE,
        ...(opciones.calendarId ? { calendarId: opciones.calendarId } : {}),
      });
      await this.registrarEvento(tenantId, 'INFO', 'Correo agendado en Calendar', {
        id,
        fecha: clasificacion.fecha,
        resumen: clasificacion.resumen,
      });
    } else if (
      clasificacion.intent === 'responder' &&
      opciones.autoReply &&
      clasificacion.respuesta
    ) {
      const to = this.extraerCorreo(correo.from);
      if (to) {
        await this.integrations.runForEngine(integrationId, {
          kind: 'gmail',
          action: 'send',
          to,
          subject: `Re: ${correo.subject ?? ''}`,
          body: clasificacion.respuesta,
        });
        await this.registrarEvento(tenantId, 'INFO', 'Correo respondido', {
          id,
          to,
        });
      }
    }

    // 5) Marcar como leído para no reprocesarlo.
    await this.marcarLeido(integrationId, id);
  }

  /** Marca un correo como leído (quita la etiqueta UNREAD). Tolerante a fallos. */
  private async marcarLeido(integrationId: string, id: string): Promise<void> {
    try {
      await this.integrations.runForEngine(integrationId, {
        kind: 'gmail',
        action: 'modify',
        id,
        removeLabelIds: ['UNREAD'],
      });
    } catch (err) {
      this.logger.warn(`No se pudo marcar leído el correo ${id}: ${this.msg(err)}`);
    }
  }

  /**
   * Parsea la respuesta del LLM con tolerancia: extrae el primer bloque {...}
   * y lo interpreta como JSON. Devuelve null si no se puede.
   */
  private parseClasificacion(reply: string): ClasificacionCorreo | null {
    if (!reply) return null;
    const match = reply.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const obj = JSON.parse(match[0]) as Partial<ClasificacionCorreo>;
      const intent = obj.intent;
      if (intent !== 'agendar' && intent !== 'responder' && intent !== 'ignorar') {
        return null;
      }
      return {
        intent,
        fecha: typeof obj.fecha === 'string' ? obj.fecha : null,
        resumen: typeof obj.resumen === 'string' ? obj.resumen : '',
        respuesta: typeof obj.respuesta === 'string' ? obj.respuesta : '',
      };
    } catch {
      return null;
    }
  }

  /** Extrae el correo "puro" de un header From (ej. "Nombre <a@b.com>"). */
  private extraerCorreo(from: string): string {
    if (!from) return '';
    const match = from.match(/<([^>]+)>/);
    const candidato = (match ? match[1] : from).trim();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidato) ? candidato : '';
  }

  /** Registra un evento en EventLog (tolerante a fallos). */
  private async registrarEvento(
    tenantId: string,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    meta: Record<string, any>,
  ): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          tenantId,
          level,
          source: 'email-agent',
          message,
          meta: meta as any,
        },
      });
    } catch (err) {
      // El log de auditoría nunca debe romper el flujo; se deja traza en debug.
      this.logger.debug(
        `No se pudo registrar el evento "${message}" (tenant ${tenantId}): ${this.msg(err)}`,
      );
    }
  }

  /** Extrae un mensaje de error legible. */
  private msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
