import type { EstadoReporte, Prioridad, Rol, TipoEmergencia } from './contrato';

export * from './contrato';

/**
 * Vistas de demo en el header. Brigadista y Socorro no están en el contrato JWT aún.
 * Ciudadano, Gestor y Admin usan los mismos literales que la API.
 */
export type DemoView = Rol | 'Brigadista' | 'Socorro';

export type CitizenReportType = 'testigo' | 'afectado';

export type TrustLevel = 'autorreportado' | 'verificado' | 'censado' | 'avalado';

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  autorreportado: 'Autorreportado',
  verificado: 'Verificado por entidad',
  censado: 'Censado por brigadista',
  avalado: 'Avalado por CMGRD',
};

/** @deprecated Usar `TipoEmergencia` de `./contrato`. */
export type EmergencyType = TipoEmergencia;

/** @deprecated Usar `EstadoReporte` de `./contrato`. */
export type ReportStatus = EstadoReporte;

/** @deprecated Usar `Prioridad` de `./contrato`. */
export type SeverityLevel = 'Baja' | 'Media' | 'Alta';

/**
 * @deprecated Forma antigua, anterior al contrato de API. Usar `ReporteResumen` para listados y
 * `ReporteDetalle` para la pantalla de seguimiento. Se mantiene mientras se migran las pantallas.
 */
export interface Report {
  id: string;
  type: EmergencyType;
  reportType: CitizenReportType;
  title: string;
  description: string;
  status: ReportStatus;
  prioridad: Prioridad;
  trustLevel: TrustLevel;
  location: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  satelliteVerified: boolean;
  publicSpending?: number;
  timeline: TimelineEvent[];
  contactPhone?: string;
  householdSize?: number;
  isHabitable?: boolean;
  urgentNeed?: string;
}

/** @deprecated Usar `EventoCronologia` de `./contrato`. */
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'report' | 'verification' | 'satellite' | 'action' | 'spending' | 'resolved';
}

export interface AidCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  items: AidItem[];
}

export interface AidItem {
  id: string;
  title: string;
  entity: string;
  requirements: string[];
  lostDocsAlternative?: string;
  status: 'disponible' | 'agotado' | 'proximo';
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  prioridad: Prioridad;
  location: string;
  createdAt: string;
  source: 'citizen' | 'satellite' | 'social_media' | 'official';
  active: boolean;
}

export interface DashboardStats {
  totalReports: number;
  activeEmergencies: number;
  resolvedToday: number;
  avgResponseTime: string;
  pendingVerification: number;
  resourcesDeployed: number;
}
