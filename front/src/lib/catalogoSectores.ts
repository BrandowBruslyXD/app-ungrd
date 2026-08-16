import {
  Church,
  Droplets,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  RadioTower,
  Route,
  Store,
  Trophy,
  Wheat,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SECTORES, type Sector } from '@/types/sectorial';

/** Lo que hay que saber de un sector para armarle el paquete a su ministerio. */
export interface FichaSector {
  sector: Sector;
  /** Clave de i18n con el nombre visible. El nombre nunca se escribe en la pantalla. */
  claveNombre: string;
  /**
   * Nombre oficial de la entidad responsable.
   *
   * No pasa por i18n porque no es texto de interfaz: es el destinatario que se
   * imprime en el oficio y viaja en el CSV. Traducirlo cambiaría el nombre de
   * una entidad del Estado en un documento oficial.
   */
  entidad: string;
  /**
   * Correo de contacto. **Siempre `@ejemplo.gov.co` en la demo** (decisión 9).
   *
   * Mandarle un correo de prueba a un ministerio real sería un problema de
   * verdad, y en producción esto se configura, no se quema en el código.
   */
  correo: string;
  /** El mismo icono en las dos pantallas: la tabla del reparto y el paquete. */
  icono: LucideIcon;
}

/**
 * El mapa sector → ministerio, derivado de las secciones del formato oficial
 * **FR-1703-SMD-09** (`docs/REPARTO-SECTORIAL.md`, «Mapa sector → ministerio»).
 *
 * Es un `Record` completo y no una lista suelta para que agregar un sector a
 * `SECTORES` rompa la compilación aquí hasta que alguien decida qué entidad lo
 * atiende. Un sector sin entidad responsable es un paquete que no se puede
 * enviar.
 */
export const CATALOGO_SECTORES: Record<Sector, FichaSector> = {
  Salud: {
    sector: 'Salud',
    claveNombre: 'ungrd.sectores.Salud',
    entidad: 'Ministerio de Salud y Protección Social',
    correo: 'salud@ejemplo.gov.co',
    icono: HeartPulse,
  },
  Educacion: {
    sector: 'Educacion',
    claveNombre: 'ungrd.sectores.Educacion',
    entidad: 'Ministerio de Educación Nacional',
    correo: 'educacion@ejemplo.gov.co',
    icono: GraduationCap,
  },
  Vivienda: {
    sector: 'Vivienda',
    claveNombre: 'ungrd.sectores.Vivienda',
    entidad: 'Ministerio de Vivienda, Ciudad y Territorio',
    correo: 'vivienda@ejemplo.gov.co',
    icono: Home,
  },
  AguaYSaneamiento: {
    sector: 'AguaYSaneamiento',
    claveNombre: 'ungrd.sectores.AguaYSaneamiento',
    entidad: 'Ministerio de Vivienda, Ciudad y Territorio',
    correo: 'aguaysaneamiento@ejemplo.gov.co',
    icono: Droplets,
  },
  Energia: {
    sector: 'Energia',
    claveNombre: 'ungrd.sectores.Energia',
    entidad: 'Ministerio de Minas y Energía',
    correo: 'energia@ejemplo.gov.co',
    icono: Zap,
  },
  Telecomunicaciones: {
    sector: 'Telecomunicaciones',
    claveNombre: 'ungrd.sectores.Telecomunicaciones',
    entidad: 'Ministerio de Tecnologías de la Información y las Comunicaciones',
    correo: 'tic@ejemplo.gov.co',
    icono: RadioTower,
  },
  Transporte: {
    sector: 'Transporte',
    claveNombre: 'ungrd.sectores.Transporte',
    entidad: 'Ministerio de Transporte',
    correo: 'transporte@ejemplo.gov.co',
    icono: Route,
  },
  Agropecuario: {
    sector: 'Agropecuario',
    claveNombre: 'ungrd.sectores.Agropecuario',
    entidad: 'Ministerio de Agricultura y Desarrollo Rural',
    correo: 'agricultura@ejemplo.gov.co',
    icono: Wheat,
  },
  ComercioIndustria: {
    sector: 'ComercioIndustria',
    claveNombre: 'ungrd.sectores.ComercioIndustria',
    entidad: 'Ministerio de Comercio, Industria y Turismo',
    correo: 'comercio@ejemplo.gov.co',
    icono: Store,
  },
  Cultura: {
    sector: 'Cultura',
    claveNombre: 'ungrd.sectores.Cultura',
    entidad: 'Ministerio de Cultura',
    correo: 'cultura@ejemplo.gov.co',
    icono: Church,
  },
  Deporte: {
    sector: 'Deporte',
    claveNombre: 'ungrd.sectores.Deporte',
    entidad: 'Ministerio del Deporte',
    correo: 'deporte@ejemplo.gov.co',
    icono: Trophy,
  },
  InclusionSocial: {
    sector: 'InclusionSocial',
    claveNombre: 'ungrd.sectores.InclusionSocial',
    entidad: 'ICBF · Prosperidad Social',
    correo: 'inclusionsocial@ejemplo.gov.co',
    icono: HeartHandshake,
  },
  Gobierno: {
    sector: 'Gobierno',
    claveNombre: 'ungrd.sectores.Gobierno',
    entidad: 'Ministerio del Interior',
    correo: 'gobierno@ejemplo.gov.co',
    icono: Landmark,
  },
};

/** Las trece fichas en el orden de las secciones del formato oficial. */
export const FICHAS_SECTOR: readonly FichaSector[] = SECTORES.map(
  (sector) => CATALOGO_SECTORES[sector],
);

/** Posición del sector en el formato oficial. Sirve de desempate estable al ordenar. */
export function ordenDelSector(sector: Sector): number {
  return SECTORES.indexOf(sector);
}
