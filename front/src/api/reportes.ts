import type { Alert, AidCategory, Report } from '@/types';
import { mockAidCategories, mockAlerts, mockReports } from '@/mocks/mock';

/** Hoy lee mocks; al conectar el backend solo cambia esta capa. */
export function listReportes(): Report[] {
  return mockReports;
}

export function getReporte(id: string): Report | undefined {
  return mockReports.find((report) => report.id === id);
}

export function listMisReportes(): Report[] {
  return mockReports;
}

export function listAlertas(): Alert[] {
  return mockAlerts;
}

export function listAyudas(): AidCategory[] {
  return mockAidCategories;
}
