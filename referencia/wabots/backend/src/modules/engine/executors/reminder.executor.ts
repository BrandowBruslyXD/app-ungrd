import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { zonedNaiveToUtc } from '../../../common/time/zoned-time';
import { interpolate } from './interpolate';

/** Anticipación por defecto del recordatorio respecto a la cita (minutos). */
const DEFAULT_LEAD_MINUTES = 120;

/**
 * Nodo Recordatorio: cuando el AGENTE decide agendar un recordatorio de cita,
 * este nodo PERSISTE un registro `Reminder` (funciona con o sin Calendar). No
 * envía nada aquí: un cron (RemindersService) lo evalúa cuando llega su hora
 * (sendAt = cita − leadMinutes) y, antes de enviar, un LLM revisa la
 * conversación y decide si mandarlo, redactando el mensaje para el cliente final.
 *
 * Inyecta Prisma/Crypto directamente (módulos globales) para NO depender del
 * RemindersService y evitar dependencias circulares con Whatsapp/Integrations.
 * Sale 'out' (agendado o nada que agendar) / 'onError' (fecha ilegible).
 */
@Injectable()
export class ReminderExecutor implements NodeExecutor {
  readonly type: NodeType = 'reminder';
  private readonly logger = new Logger(ReminderExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    try {
      const d: any = node.data ?? {};
      const tz = (d.timezone && String(d.timezone)) || 'America/Bogota';
      const appointmentRaw = interpolate(String(d.appointment ?? ''), ctx.variables).trim();
      if (!appointmentRaw) {
        this.logger.warn('Nodo reminder sin fecha de cita; se omite.');
        return { nextHandle: 'onError' };
      }

      const appointmentAt = zonedNaiveToUtc(appointmentRaw, tz);
      if (!appointmentAt || isNaN(appointmentAt.getTime())) {
        this.logger.warn(`Nodo reminder: fecha ilegible "${appointmentRaw}".`);
        return { nextHandle: 'onError' };
      }

      const now = Date.now();
      // Cita ya pasó → no hay nada que recordar (no es un error del flujo).
      if (appointmentAt.getTime() <= now) {
        return { setVariables: { __reminderScheduled: false }, nextHandle: 'out' };
      }

      const leadMinutes =
        Number.isFinite(+d.leadMinutes) && +d.leadMinutes > 0
          ? Math.floor(+d.leadMinutes)
          : DEFAULT_LEAD_MINUTES;
      let sendAtMs = appointmentAt.getTime() - leadMinutes * 60_000;
      // Si la anticipación cae en el pasado (cita muy próxima), evaluar ya.
      if (sendAtMs < now) sendAtMs = now;

      const to =
        interpolate(String(d.to ?? '{{contacto}}'), ctx.variables).trim() ||
        ctx.contactPhone;
      if (!to) {
        this.logger.warn('Nodo reminder sin teléfono destino; se omite.');
        return { nextHandle: 'onError' };
      }

      const contactName =
        (ctx.variables?.nombre as string) ||
        (ctx.variables?.contactoNombre as string) ||
        null;

      // Modo ENSAYO (editor/preview): no se persiste ningún recordatorio real;
      // se simula el agendamiento para que la vista previa sea fiel.
      if (ctx.dryRun) {
        return {
          setVariables: { reminderId: '(ensayo)', __reminderScheduled: true },
          nextHandle: 'out',
        };
      }

      // Snapshot del LLM para que el cron decida/redacte igual que el flujo.
      const llmMode = (d.llmMode as string) || 'node';
      const provider = d.provider ? String(d.provider) : null;
      const model = d.model ? String(d.model) : null;
      const baseUrl = d.baseUrl ? String(d.baseUrl) : null;
      const apiKeyEnc =
        llmMode === 'node' && d.apiKey
          ? this.crypto.encrypt(String(d.apiKey))
          : null;

      const reminder = await this.prisma.reminder.create({
        data: {
          tenantId: ctx.tenantId,
          conversationId: ctx.conversationId || null,
          contactPhone: to,
          contactName,
          appointmentAt,
          appointmentRaw,
          timezone: tz,
          leadMinutes,
          sendAt: new Date(sendAtMs),
          instructions: d.instructions ? String(d.instructions) : null,
          llmMode,
          provider,
          model,
          apiKeyEnc,
          baseUrl,
        },
      });

      return {
        setVariables: { reminderId: reminder.id, __reminderScheduled: true },
        nextHandle: 'out',
      };
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo agendar el recordatorio: ${m}`);
      return { nextHandle: 'onError' };
    }
  }
}
