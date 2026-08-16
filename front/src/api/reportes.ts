import type { Alert, AidCategory, Report, EmergencyType } from '@/types';
import { mockAidCategories, mockAlerts, mockReports } from '@/mocks/mock';
import { listarRegistros, type RegistroGuardado } from '@/lib/almacenamiento';
import type { ReporteGuardado } from '@/features/reportes/hooks/useReportWizard';

/**
 * Capa de datos de reportes.
 *
 * Mezcla dos orígenes y esa mezcla es intencional:
 *
 * - Los **reportes de ejemplo**, que dan cuerpo a la demostración y muestran
 *   estados avanzados de la cronología que un reporte recién creado no tiene.
 * - Los **reportes que la persona acaba de hacer**, leídos del almacenamiento
 *   del dispositivo. Sin esto, alguien reportaba, recibía un código y al entrar
 *   a «Mis reportes» no encontraba nada: el código no consultaba nada real, que
 *   es exactamente lo que el guion de la línea telefónica prohíbe.
 *
 * Cuando el backend exponga los endpoints, lo único que cambia es de dónde sale
 * `propios`.
 */

/** Un reporte recién creado siempre arranca en el primer peldaño. */
function aReporte(registro: RegistroGuardado<ReporteGuardado>): Report {
  const { datos, codigo, creadoEn } = registro;
  const tipo: EmergencyType = datos.type || 'Otro';

  return {
    id: codigo,
    type: tipo,
    reportType: datos.reportType,
    // El título se arma con lo que hay: si no escribió descripción, al menos el
    // tipo de evento identifica la tarjeta en el listado.
    title: datos.description.trim().split('\n')[0].slice(0, 80) || tipo,
    description: datos.description,
    status: 'Reportado',
    prioridad: datos.severity === 'grave' ? 'Alta' : datos.severity === 'moderado' ? 'Media' : 'Baja',
    trustLevel: 'autorreportado',
    location: datos.location || (datos.coordinates ? 'Punto marcado en el mapa' : ''),
    coordinates: datos.coordinates ?? { lat: 0, lng: 0 },
    createdAt: creadoEn,
    updatedAt: creadoEn,
    satelliteVerified: false,
    timeline: [
      {
        id: `${codigo}-1`,
        date: creadoEn,
        title: 'Reporte recibido',
        description: 'Su reporte quedó registrado y está en la cola de revisión del municipio.',
        type: 'report',
      },
    ],
    contactPhone: datos.contactPhone || undefined,
    householdSize: datos.reportType === 'afectado' ? datos.householdSize : undefined,
    isHabitable: datos.reportType === 'afectado' ? datos.isHabitable : undefined,
    urgentNeed: datos.urgentNeed || undefined,
  };
}

/** Los reportes hechos desde este dispositivo, del más reciente al más antiguo. */
export function listarPropios(): Report[] {
  return listarRegistros<ReporteGuardado>('reporte').map(aReporte);
}

export function listReportes(): Report[] {
  return mockReports;
}

export function getReporte(id: string): Report | undefined {
  return [...listarPropios(), ...mockReports].find((report) => report.id === id);
}

export function listMisReportes(): Report[] {
  return [...listarPropios(), ...mockReports];
}

export function listAlertas(): Alert[] {
  return mockAlerts;
}

export function listAyudas(): AidCategory[] {
  return mockAidCategories;
}
