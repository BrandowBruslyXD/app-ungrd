import { io } from 'socket.io-client';
import { getAccessToken } from './api';

// Socket único para estado en vivo (QR, conexión de WhatsApp). El handshake
// envía el access token vigente; se relee en cada (re)conexión.
let socket;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      autoConnect: true,
      transports: ['websocket'],
      auth: (cb) => cb({ token: getAccessToken() }),
    });
  }
  return socket;
}

/** Cierra el socket (p. ej. al cerrar sesión). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}

/** Suscribe a los eventos de un tenant (`tenant:<id>`). Devuelve la desuscripción. */
export function subscribeTenant(tenantId, handler) {
  const s = getSocket();
  const event = `tenant:${tenantId}`;
  s.on(event, handler);
  return () => s.off(event, handler);
}

/**
 * Suscribe a la expulsión de sesión: el servidor emite 'session:revoked' cuando
 * el usuario inicia sesión en OTRO dispositivo (sesión única). Fuerza la
 * conexión del socket para recibirlo aunque no estés en una página con tenant.
 * Devuelve la desuscripción.
 */
export function onSessionRevoked(handler) {
  const s = getSocket();
  s.on('session:revoked', handler);
  return () => s.off('session:revoked', handler);
}
