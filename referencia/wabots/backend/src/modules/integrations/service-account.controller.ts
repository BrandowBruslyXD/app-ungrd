import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { IntegrationsService } from './integrations.service';
import { SaveServiceAccountDto } from './dto/save-service-account.dto';

/**
 * Endpoint para registrar una CUENTA DE SERVICIO de Google Calendar
 * (Modelo C: agenda directa, sin OAuth/consent).
 *  - POST /integrations/google/service-account (JwtAuthGuard + rol SUPERADMIN).
 */
@Controller('integrations/google')
export class ServiceAccountController {
  private readonly logger = new Logger(ServiceAccountController.name);

  constructor(private readonly integrations: IntegrationsService) {}

  /**
   * Guarda (o actualiza) la cuenta de servicio para Calendar.
   * `serviceAccount` puede venir como objeto o como string (el JSON crudo del
   * archivo descargado de Google Cloud); en ese caso se parsea.
   */
  @Roles(AdminRole.SUPERADMIN)
  @Post('service-account')
  async saveServiceAccount(@Body() body: SaveServiceAccountDto) {
    const { level, tenantId, calendarId } = body ?? {};

    if (!calendarId || !String(calendarId).trim()) {
      throw new BadRequestException(
        'Falta calendarId (correo del calendario compartido con la cuenta de servicio).',
      );
    }

    const isPlatform = level === 'platform';
    if (!isPlatform && !tenantId) {
      throw new BadRequestException(
        "Debes indicar tenantId (por empresa) o level='platform' (plataforma).",
      );
    }

    // Acepta el objeto ya parseado o el string crudo del archivo JSON.
    let sa: Record<string, any>;
    if (typeof body.serviceAccount === 'string') {
      try {
        sa = JSON.parse(body.serviceAccount);
      } catch {
        throw new BadRequestException(
          'serviceAccount no es un JSON válido. Pega el contenido del archivo de la cuenta de servicio.',
        );
      }
    } else if (body.serviceAccount && typeof body.serviceAccount === 'object') {
      sa = body.serviceAccount;
    } else {
      throw new BadRequestException(
        'Falta serviceAccount (objeto o string con el JSON de la cuenta de servicio).',
      );
    }

    const clientEmail = sa.client_email;
    const privateKey = sa.private_key;
    if (!clientEmail || !privateKey) {
      throw new BadRequestException(
        'El JSON de la cuenta de servicio debe incluir client_email y private_key.',
      );
    }

    const target = isPlatform ? null : (tenantId as string);
    await this.integrations.saveServiceAccount(target, String(calendarId).trim(), {
      client_email: String(clientEmail),
      private_key: String(privateKey),
    });

    this.logger.log(
      `Cuenta de servicio de Calendar registrada para ${
        isPlatform ? 'plataforma (global)' : `tenant ${tenantId}`
      }.`,
    );
    return { data: { ok: true } };
  }
}
