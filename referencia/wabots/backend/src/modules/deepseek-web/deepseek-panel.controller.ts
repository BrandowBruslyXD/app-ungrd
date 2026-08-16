import { Body, Controller, Get, Post } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Panel de la sesión DeepSeek-web para el ADMIN (protegido por el guard JWT
 * global; NO es @Public). Muestra el estado del pool (leído de la BD) y dispara
 * login/logout DELEGANDO en el daemon (contenedor aparte con navegador+VNC), al
 * que llega por la red interna con un token compartido (DS_CTRL_TOKEN). Nunca
 * expone bearers ni credenciales.
 */
@Controller('admin/deepseek-panel')
export class DeepseekPanelController {
  constructor(private readonly prisma: PrismaService) {}

  private daemonUrl(): string {
    return (process.env.DS_DAEMON_URL || 'http://wabots-deepseek-daemon:6180').replace(/\/+$/, '');
  }

  private async callDaemon(path: string, method: string, body?: unknown) {
    const token = process.env.DS_CTRL_TOKEN || '';
    try {
      const r = await fetch(`${this.daemonUrl()}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-ctrl-token': token },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, body: j };
    } catch (e) {
      return { ok: false, status: 0, body: { error: `daemon no disponible: ${String((e as Error)?.message || e)}` } };
    }
  }

  /** Estado del pool (sin secretos) + si hay un login en curso y el puerto VNC. */
  @Get('status')
  async status() {
    const accounts = await this.prisma.deepseekAccount.findMany({
      select: { id: true, label: true, status: true, failCount: true, lastError: true, lastUsedAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    // loginActive/vncPort son best-effort desde el daemon (si no responde, false).
    const d = await this.callDaemon('/status', 'GET');
    return {
      ok: true,
      accounts,
      loginActive: !!(d.ok && d.body?.loginActive),
      vncPort: d.body?.vncPort || 5900,
      daemonUp: d.ok,
    };
  }

  /** Dispara el login interactivo (VNC) en el daemon para la cuenta `label`. */
  @Post('login')
  async login(@Body() body: { label?: string }) {
    const d = await this.callDaemon('/login', 'POST', { label: body?.label });
    return { ok: d.ok, ...d.body };
  }

  /** Cierra la sesión (users/logout) y saca la cuenta del pool. */
  @Post('logout')
  async logout(@Body() body: { label?: string }) {
    const d = await this.callDaemon('/logout', 'POST', { label: body?.label });
    return { ok: d.ok, ...d.body };
  }
}
