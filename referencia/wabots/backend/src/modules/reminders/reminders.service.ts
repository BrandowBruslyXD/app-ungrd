import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reminder, ReminderStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { IntegrationsService } from '../integrations/integrations.service';

/** Máximo de intentos antes de marcar el recordatorio como FAILED. */
const MAX_ATTEMPTS = 3;
/** Cuántos recordatorios procesar por corrida del cron. */
const BATCH = 50;

interface AiDecision {
  enviar: boolean;
  motivo: string;
  mensaje: string;
}

/**
 * Entrega autónoma de recordatorios de cita al CLIENTE FINAL.
 *
 * Un cron busca recordatorios PENDING cuya hora (`sendAt`) ya llegó. Para cada
 * uno, un LLM RELEE la conversación y DECIDE si enviarlo (según cómo quedaron) y
 * redacta el mensaje; si decide enviarlo, se manda por el canal del tenant
 * (Evolution/Twilio/Meta). Persiste con o sin Calendar conectado.
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly whatsapp: WhatsappService,
    private readonly integrations: IntegrationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async dispatchDue(): Promise<void> {
    if (this.running) return; // evita solapamiento entre corridas
    this.running = true;
    try {
      const due = await this.prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          sendAt: { lte: new Date() },
          // Empresa apagada (switch OFF) = servicio apagado: sus recordatorios
          // no consumen LLM ni envían WhatsApp. Quedan PENDING por si se
          // reactiva a tiempo; si la cita pasa mientras tanto, la corrida
          // siguiente los marca SKIPPED ("la cita ya pasó").
          tenant: { status: TenantStatus.ACTIVE },
        },
        orderBy: { sendAt: 'asc' },
        take: BATCH,
      });
      for (const r of due) {
        try {
          await this.processOne(r);
        } catch (err) {
          await this.markFailure(r, err);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Evalúa un recordatorio: pregunta al LLM y envía o descarta. */
  private async processOne(r: Reminder): Promise<void> {
    // Si la cita ya pasó (quedó rezagado), no tiene sentido recordar.
    if (r.appointmentAt.getTime() <= Date.now()) {
      await this.prisma.reminder.update({
        where: { id: r.id },
        data: { status: ReminderStatus.SKIPPED, decision: 'La cita ya pasó; no se envió.' },
      });
      return;
    }

    const history = await this.loadHistory(r.conversationId);
    const decision = await this.decide(r, history);

    if (!decision.enviar || !decision.mensaje.trim()) {
      await this.prisma.reminder.update({
        where: { id: r.id },
        data: {
          status: ReminderStatus.SKIPPED,
          decision: decision.motivo || 'El agente decidió no enviar el recordatorio.',
        },
      });
      return;
    }

    await this.whatsapp.sendMessage(r.tenantId, r.contactPhone, {
      type: 'text',
      text: decision.mensaje.trim(),
    });

    await this.prisma.reminder.update({
      where: { id: r.id },
      data: {
        status: ReminderStatus.SENT,
        sentText: decision.mensaje.trim(),
        sentAt: new Date(),
        decision: decision.motivo || 'Enviado.',
      },
    });
    this.logger.log(`Recordatorio ${r.id} enviado a ${r.contactPhone}.`);
  }

  /** Lee el historial de la conversación (si existe) para dárselo al LLM. */
  private async loadHistory(
    conversationId: string | null,
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    if (!conversationId) return [];
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { variables: true },
    });
    const vars = (conv?.variables ?? {}) as Record<string, any>;
    const hist = vars.__aiHistory;
    if (!Array.isArray(hist)) return [];
    return hist
      .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
      .slice(-20);
  }

  /** Llama al LLM para decidir si enviar y redactar el mensaje. */
  private async decide(
    r: Reminder,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<AiDecision> {
    const cuando = this.formatInTz(r.appointmentAt, r.timezone);
    const quien = r.contactName ? ` para ${r.contactName}` : '';
    const systemPrompt = [
      'Eres una persona del equipo del negocio. Vas a decidir si ENVIAR o NO un recordatorio de cita por WhatsApp al cliente, releyendo la conversación previa.',
      `La cita${quien} está agendada para: ${cuando} (zona ${r.timezone}).`,
      r.instructions ? `Indicaciones del negocio: ${r.instructions}` : '',
      'Criterio:',
      '- Si el cliente confirmó/aceptó la cita y NO la canceló ni pidió reprogramar → enviar = true.',
      '- Si canceló, dijo que no podía, pidió otro día, o la charla indica que ya no aplica → enviar = false.',
      'El mensaje debe ser breve y cordial, en el idioma del cliente, recordando el día y la hora, sin decir que eres un bot/IA ni mencionar sistemas.',
      'Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni ```: {"enviar": true|false, "motivo": "breve", "mensaje": "texto a enviar o cadena vacía"}.',
    ]
      .filter(Boolean)
      .join('\n');

    const userText =
      'Relee la conversación anterior y decide si corresponde enviar ahora el recordatorio de la cita. Devuelve solo el JSON.';

    const useNode = r.llmMode === 'node';
    const apiKey = useNode && r.apiKeyEnc ? this.crypto.decrypt(r.apiKeyEnc) : '';
    const llm =
      useNode && r.provider && r.model && apiKey
        ? { provider: r.provider, model: r.model, apiKey, ...(r.baseUrl ? { baseUrl: r.baseUrl } : {}) }
        : undefined;

    const reply = await this.integrations.runForEngine('', {
      kind: 'ai',
      tenantId: r.tenantId,
      conversationId: r.conversationId ?? undefined,
      source: useNode ? undefined : r.llmMode, // platform | tenant
      systemPrompt,
      userText,
      history,
      variables: {},
      ...(llm ? { llm } : {}),
    });

    const text =
      typeof reply === 'string' ? reply : reply?.text ?? reply?.reply ?? '';
    return this.parseDecision(text);
  }

  /** Extrae el JSON de decisión de la respuesta del LLM de forma tolerante. */
  private parseDecision(text: string): AiDecision {
    const fallback: AiDecision = {
      enviar: false,
      motivo: 'No se pudo interpretar la decisión del agente.',
      mensaje: '',
    };
    if (!text) return fallback;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return fallback;
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      return {
        enviar: obj.enviar === true,
        motivo: typeof obj.motivo === 'string' ? obj.motivo : '',
        mensaje: typeof obj.mensaje === 'string' ? obj.mensaje : '',
      };
    } catch {
      return fallback;
    }
  }

  /** Formatea un instante en la zona horaria del negocio, en español. */
  private formatInTz(date: Date, tz: string): string {
    try {
      return new Intl.DateTimeFormat('es', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return date.toISOString();
    }
  }

  /** Cuenta un intento fallido; a los MAX_ATTEMPTS marca FAILED. */
  private async markFailure(r: Reminder, err: unknown): Promise<void> {
    const msg = err instanceof Error ? err.message : String(err);
    const attempts = r.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    this.logger.warn(
      `Recordatorio ${r.id} falló (intento ${attempts}/${MAX_ATTEMPTS}): ${msg}`,
    );
    await this.prisma.reminder.update({
      where: { id: r.id },
      data: {
        attempts,
        lastError: msg.slice(0, 500),
        ...(failed ? { status: ReminderStatus.FAILED } : {}),
      },
    });
    // Deja rastro auditable en el visor de logs (best-effort).
    try {
      await this.prisma.eventLog.create({
        data: {
          tenantId: r.tenantId,
          level: failed ? 'ERROR' : 'WARN',
          source: 'reminders',
          message: failed
            ? `Recordatorio ${r.id} marcado FAILED tras ${attempts} intentos`
            : `Recordatorio ${r.id} falló (intento ${attempts}/${MAX_ATTEMPTS})`,
          meta: { reminderId: r.id, contactPhone: r.contactPhone, error: msg.slice(0, 300) },
        },
      });
    } catch {
      /* la auditoría nunca interrumpe el cron */
    }
  }
}
