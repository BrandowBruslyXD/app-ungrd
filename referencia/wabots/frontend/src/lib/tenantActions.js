import { activateTenant, suspendTenant } from './tenantsApi';

/**
 * Activa o suspende el servicio de un tenant según `next`.
 * Compartido entre el listado de empresas y el detalle de empresa.
 */
export async function setTenantServiceStatus(tenantId, next) {
  if (next) await activateTenant(tenantId);
  else await suspendTenant(tenantId);
}

/**
 * Mensaje de error para el cambio de estado del servicio.
 * La causa típica al activar es Evolution/WhatsApp apagado.
 */
export function tenantToggleErrorMessage(err, next) {
  const fallback = next
    ? 'No se pudo activar: WhatsApp/Evolution no está disponible'
    : 'No se pudo suspender el servicio';
  return err?.response?.data?.message || fallback;
}
