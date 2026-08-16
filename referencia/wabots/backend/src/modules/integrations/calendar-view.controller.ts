import { Controller, Get, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

/**
 * VISOR de Google Calendar para el panel admin. Lista las próximas citas
 * agendadas, ya sea del calendario de PLATAFORMA (cuenta de servicio global)
 * o del calendario de una EMPRESA (tenant). Protegido con JWT.
 *
 * Reusa el punto único del motor (IntegrationsService.runForEngine) con el
 * payload de calendario { kind:'calendar', action:'listEvents', ... }, sin
 * cambiar ninguna firma existente.
 */
@Controller('admin/calendar')
export class CalendarViewController {
  constructor(private readonly integrations: IntegrationsService) {}

  /**
   * Lista los próximos eventos del calendario.
   *  - source: 'platform' (por defecto) o 'tenant'.
   *  - tenantId: requerido si source='tenant' (lo valida resolveIntegration).
   *  - max: número máximo de eventos a traer (por defecto 20).
   *
   * Normaliza la respuesta cruda de Google (items: [...]) a una forma simple
   * para el frontend. Es TOLERANTE a fallos: ante cualquier error devuelve
   * { data: [], error } con 200, para no romper el panel.
   */
  @Get('events')
  async events(
    @Query('source') source?: string,
    @Query('tenantId') tenantId?: string,
    @Query('max') max?: string,
  ) {
    try {
      const raw = await this.integrations.runForEngine('', {
        kind: 'calendar',
        action: 'listEvents',
        source: source || 'platform',
        tenantId,
        maxResults: Number(max) || 20,
      });

      const items: any[] = Array.isArray(raw?.items) ? raw.items : [];
      const data = items.map((ev) => this.normalize(ev));
      return { data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { data: [], error: message };
    }
  }

  /**
   * Normaliza un evento de Google a la forma que consume el visor.
   * start/end vienen como `dateTime` (con hora) o `date` (evento de día
   * completo). allDay es true cuando Google sólo trae `date`.
   */
  private normalize(ev: any) {
    const start = ev?.start?.dateTime || ev?.start?.date || null;
    const end = ev?.end?.dateTime || ev?.end?.date || null;
    const allDay = !ev?.start?.dateTime && !!ev?.start?.date;

    const attendees: string[] = Array.isArray(ev?.attendees)
      ? ev.attendees
          .map((a: any) => a?.email)
          .filter((e: any) => typeof e === 'string' && e)
      : [];

    return {
      id: ev?.id ?? null,
      title: ev?.summary || '(sin título)',
      start,
      end,
      allDay,
      attendees,
      htmlLink: ev?.htmlLink ?? null,
      status: ev?.status ?? null,
    };
  }
}
