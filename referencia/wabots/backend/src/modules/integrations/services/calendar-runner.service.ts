import { Injectable } from '@nestjs/common';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { CalendarService } from './calendar.service';
import { RunForEnginePayload } from './integration-run.types';

/**
 * Ejecución de nodos de Calendar para el motor: descifra la cuenta de servicio
 * (Modelo C) si existe y delega en CalendarService (que también soporta OAuth).
 */
@Injectable()
export class CalendarRunnerService {
  constructor(
    private readonly crypto: CryptoService,
    private readonly calendar: CalendarService,
  ) {}

  /**
   * Calendar. Modelo C: si la integración guarda una cuenta de servicio cifrada,
   * se descifra y se pasa a CalendarService; si no, se usa el flujo OAuth
   * (refreshToken) existente. El calendarId de la integración (config.calendarId)
   * viaja siempre; el del nodo (payload.calendarId), si viene, tiene prioridad
   * dentro de CalendarService.
   */
  async runCalendar(
    config: Record<string, any>,
    payload: RunForEnginePayload,
  ): Promise<any> {
    if (config.serviceAccountEnc) {
      try {
        config.serviceAccount = JSON.parse(
          this.crypto.decrypt(config.serviceAccountEnc),
        );
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        throw new Error(
          `No se pudo descifrar la cuenta de servicio de Calendar: ${m}`,
        );
      }
    }
    return this.calendar.run(config as any, payload as any);
  }
}
