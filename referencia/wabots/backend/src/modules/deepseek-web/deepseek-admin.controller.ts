import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeepseekAccountService } from './deepseek-account.service';

/**
 * Endpoint de SINCRONIZACIÓN del pool DeepSeek-web. Lo usa el daemon externo
 * (el keep-alive de deepseek-web-chat, que refresca el bearer headless con el
 * perfil que resuelve el WAF) para EMPUJAR el bearer fresco al servidor, sin
 * meter Chrome aquí. Auth máquina-a-máquina por token compartido
 * (DEEPSEEK_SYNC_TOKEN), no por JWT. El bearer se guarda CIFRADO (se re-cifra
 * con la ENCRYPTION_KEY del servidor); nunca queda en el repo.
 */
@Public()
@Controller('admin/deepseek')
export class DeepseekAdminController {
  constructor(
    private readonly accounts: DeepseekAccountService,
    private readonly prisma: PrismaService,
  ) {}

  private assertToken(token?: string): void {
    const expected = process.env.DEEPSEEK_SYNC_TOKEN || '';
    // Fail-closed: sin token configurado en el server, el endpoint no acepta nada.
    if (!expected || token !== expected) {
      throw new ForbiddenException('sync token inválido');
    }
  }

  /** Upsert de una cuenta con bearer/cookies FRESCOS (desde el daemon). */
  @Post('account')
  async syncAccount(
    @Headers('x-sync-token') token: string | undefined,
    @Body() body: { label?: string; bearer?: string; cookieHeader?: string | null },
  ) {
    this.assertToken(token);
    if (!body?.label || !body?.bearer) {
      throw new BadRequestException('label y bearer requeridos');
    }
    const row = await this.accounts.upsertPlaintext(body.label, body.bearer, body.cookieHeader ?? null);
    return { ok: true, id: row.id, label: row.label, status: row.status };
  }

  /** Estado del pool (sin exponer bearers), para monitoreo del daemon/panel. */
  @Get('accounts')
  async listAccounts(@Headers('x-sync-token') token: string | undefined) {
    this.assertToken(token);
    const accs = await this.prisma.deepseekAccount.findMany({
      select: { id: true, label: true, status: true, failCount: true, lastUsedAt: true, lastError: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { ok: true, accounts: accs };
  }
}
