import { WhatsappConnectionState } from '@prisma/client';

/**
 * Mapea el estado de conexión que reporta Evolution ('open'/'connecting'/
 * 'close') al enum WhatsappConnectionState. Devuelve null si el estado es
 * desconocido (el llamador decide qué hacer en ese caso).
 */
export function mapConnectionState(state?: string): WhatsappConnectionState | null {
  switch (state) {
    case 'open':
      return WhatsappConnectionState.CONNECTED;
    case 'connecting':
      return WhatsappConnectionState.CONNECTING;
    case 'close':
    case 'closed':
      return WhatsappConnectionState.DISCONNECTED;
    default:
      return null;
  }
}
