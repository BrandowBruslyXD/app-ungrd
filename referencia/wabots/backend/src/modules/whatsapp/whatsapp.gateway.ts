import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/** Sala a la que se unen las conexiones de admin autenticadas. */
const ADMIN_ROOM = 'admins';
/** Sala por SESIÓN (una por sessionId): permite expulsar una sesión concreta. */
const sessionRoom = (sessionId: string) => `session:${sessionId}`;

/**
 * Gateway socket.io que empuja estado de conexión y QR en vivo al panel.
 * Exige un access token válido en el handshake y emite solo a la sala de
 * admins autenticados (nunca en broadcast abierto): el QR es sensible.
 * Además une cada socket a la sala de SU sesión para poder expulsarla al
 * instante cuando el usuario inicia sesión en otro dispositivo (force-login).
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true },
})
export class WhatsappGateway implements OnGatewayConnection {
  private readonly logger = new Logger(WhatsappGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket): void {
    const token =
      client.handshake.auth?.token ??
      (typeof client.handshake.query?.token === 'string'
        ? client.handshake.query.token
        : undefined);
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
        algorithms: ['HS256'], // no aceptar otros algoritmos (hardening)
      });
      if (payload?.type !== 'access') throw new Error('tipo de token inválido');
      client.join(ADMIN_ROOM);
      // Une el socket a la sala de su sesión (para expulsión instantánea).
      if (payload?.sessionId) client.join(sessionRoom(payload.sessionId));

      // El socket NO puede sobrevivir a la expiración del access token: al
      // vencer (exp), se desconecta. Así, tras logout/inactividad/expiración el
      // cliente ya no recibe QR ni estado hasta reconectar con un token fresco
      // (que exige una sesión válida). Cierra el hueco de "socket eterno".
      const expSec = typeof payload?.exp === 'number' ? payload.exp : 0;
      const msToExpiry = expSec * 1000 - Date.now();
      if (msToExpiry > 0) {
        const timer = setTimeout(() => client.disconnect(true), msToExpiry);
        client.on('disconnect', () => clearTimeout(timer));
      } else {
        client.disconnect(true);
      }
    } catch {
      client.disconnect(true);
    }
  }

  /** Emite una actualización (QR/estado) a los admins autenticados. */
  emitTenantUpdate(tenantId: string, payload: unknown): void {
    this.server?.to(ADMIN_ROOM).emit(`tenant:${tenantId}`, payload);
  }

  /**
   * Expulsa AL INSTANTE la sesión indicada: avisa a sus sockets y los
   * desconecta. Se dispara cuando el usuario inicia sesión en otro dispositivo
   * (force-login reemplaza la sesión anterior). Escucha el evento desacoplado
   * emitido por AuthService (evita dependencia circular auth ↔ gateway).
   */
  @OnEvent('session.revoked')
  handleSessionRevoked(payload: { sessionId?: string; reason?: string }): void {
    const sid = payload?.sessionId;
    if (!sid || !this.server) return;
    const room = sessionRoom(sid);
    this.server.to(room).emit('session:revoked', {
      reason: payload.reason || 'Su sesión se abrió en otro dispositivo.',
    });
    // Da un instante para que el evento llegue antes de cortar la conexión.
    setTimeout(() => {
      this.server.in(room).disconnectSockets(true);
    }, 300);
  }
}
