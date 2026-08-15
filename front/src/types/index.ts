export type UserRole = 'citizen' | 'manager' | 'admin' | 'rescuer' | 'socorro';

export type CitizenReportType = 'testigo' | 'afectado';

export type TrustLevel = 'autorreportado' | 'verificado' | 'censado' | 'avalado';

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  autorreportado: 'Autorreportado',
  verificado: 'Verificado por entidad',
  censado: 'Censado por brigadista',
  avalado: 'Avalado por CMGRD',
};

export type EmergencyType =
  | 'inundacion'
  | 'deslizamiento'
  | 'incendio'
  | 'sismo'
  | 'vendaval'
  | 'sequia'
  | 'otro';

export type ReportStatus =
  | 'recibido'
  | 'verificando'
  | 'confirmado'
  | 'en_atencion'
  | 'resuelto';

export type SeverityLevel = 'baja' | 'media' | 'alta' | 'critica';

export interface Report {
  id: string;
  type: EmergencyType;
  reportType: CitizenReportType;
  title: string;
  description: string;
  status: ReportStatus;
  severity: SeverityLevel;
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
  severity: SeverityLevel;
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
