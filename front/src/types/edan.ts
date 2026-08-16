/**
 * Los 16 tipos de evento del formato oficial de consolidación de daños y
 * necesidades, **FR-1703-SMD-09 / FR-1900-SMD-04, versión 01**, en el orden en
 * que aparecen en el formato.
 *
 * La lista es cerrada y se copia textualmente a propósito. La investigación
 * (`docs/SISTEMA-REPORTES-COLOMBIA.md`, §9.2 punto 4) es explícita: si la
 * herramienta inventa su propia taxonomía, alguien tiene que traducirla a mano
 * cuando el dato suba al CDGRD, y ahí es donde se pierde y se deforma.
 *
 * Ojo: no confundir con `EmergencyType` de `@/types`, que son las 6 categorías
 * que el ciudadano escoge y que fija el contrato de API. Esa es la taxonomía de
 * entrada; esta es la del formato oficial.
 */
export const EDAN_EVENT_TYPES = [
  'sismo',
  'inundacion',
  'deslizamiento',
  'avalancha',
  'granizada',
  'tormenta_electrica',
  'tornado',
  'vendaval',
  'erupcion_volcanica',
  'tsunami',
  'incendio_forestal',
  'incendio_urbano',
  'materiales_peligrosos',
  'explosion',
  'voladura_poliducto',
  'atentado_terrorista',
] as const;

export type EdanEventType = (typeof EDAN_EVENT_TYPES)[number];

export type ZoneType = 'urbano' | 'rural';
export type HousingDamageAggregate = 'sin_dano' | 'averiada' | 'destruida';
export type HousingDamageStructural = 'leve' | 'moderado' | 'severo' | 'colapso';

export type DocumentType = 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'PEP' | 'PPT' | 'sin_documento';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: 'Cédula de Ciudadanía',
  TI: 'Tarjeta de Identidad',
  CE: 'Cédula de Extranjería',
  PA: 'Pasaporte',
  RC: 'Registro Civil',
  PEP: 'PEP',
  PPT: 'PPT',
  sin_documento: 'Sin documento',
};

export type Parentesco =
  | 'jefe_hogar'
  | 'conyuge'
  | 'hijo'
  | 'padre_madre'
  | 'hermano'
  | 'nieto'
  | 'abuelo'
  | 'otro_pariente'
  | 'no_pariente';

export const PARENTESCO_LABELS: Record<Parentesco, string> = {
  jefe_hogar: 'Jefe(a) de hogar',
  conyuge: 'Cónyuge / Compañero(a)',
  hijo: 'Hijo(a)',
  padre_madre: 'Padre / Madre',
  hermano: 'Hermano(a)',
  nieto: 'Nieto(a)',
  abuelo: 'Abuelo(a)',
  otro_pariente: 'Otro pariente',
  no_pariente: 'No pariente',
};

export type Sexo = 'M' | 'F' | 'otro';
export type GrupoEtnico = 'ninguno' | 'indigena' | 'rom' | 'raizal' | 'palenquero' | 'afrodescendiente';
export type Discapacidad = 'ninguna' | 'fisica' | 'visual' | 'auditiva' | 'cognitiva' | 'multiple';
export type CondicionSalud = 'ileso' | 'herido' | 'enfermo' | 'desaparecido' | 'fallecido';

export type NeedCategory =
  | 'ahe_alimentaria'
  | 'ahe_no_alimentaria'
  | 'materiales_rehabilitacion'
  | 'subsidio_arriendo';

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  ahe_alimentaria: 'AHE Alimentaria (alimentos, agua)',
  ahe_no_alimentaria: 'AHE No Alimentaria (kits aseo, colchonetas)',
  materiales_rehabilitacion: 'Materiales rehabilitación vivienda',
  subsidio_arriendo: 'Subsidio de arrendamiento temporal',
};

export type AffectedGood =
  | 'enseres_domesticos'
  | 'electrodomesticos'
  | 'vehiculo'
  | 'herramientas'
  | 'cultivos'
  | 'animales'
  | 'documentos'
  | 'otro';

export const AFFECTED_GOOD_LABELS: Record<AffectedGood, string> = {
  enseres_domesticos: 'Enseres domésticos',
  electrodomesticos: 'Electrodomésticos',
  vehiculo: 'Vehículo',
  herramientas: 'Herramientas de trabajo',
  cultivos: 'Cultivos / Cosechas',
  animales: 'Animales (ganado, aves)',
  documentos: 'Documentos personales',
  otro: 'Otro',
};

export interface EdanOperation {
  id: string;
  eventType: EdanEventType;
  eventDate: string;
  departamento: string;
  municipio: string;
  zone: ZoneType;
  zoneName: string;
  calamityDeclarationId?: string;
  rescuerId: string;
  status: 'en_curso' | 'cerrada';
  createdAt: string;
}

export interface HousingVisit {
  id: string;
  operationId: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  numberOfFamilies: number;
  housingType: 'casa' | 'apartamento' | 'habitacion' | 'improvisada' | 'otro';
  ownershipType: 'propia' | 'arriendo' | 'prestada' | 'invasion' | 'otro';
  waterAffected: boolean;
  sewerAffected: boolean;
  electricityAffected: boolean;
  damageAggregate: HousingDamageAggregate;
  damageStructural?: HousingDamageStructural;
  damageNotes: string;
  affectedGoods: AffectedGood[];
  createdAt: string;
}

export interface CensusFamily {
  id: string;
  housingVisitId: string;
  familyIndex: number;
  headOfHouseholdPersonId?: string;
  needs: NeedCategory[];
  needNotes: string;
  createdAt: string;
}

export interface CensusPerson {
  id: string;
  familyId: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sexo: Sexo;
  parentesco: Parentesco;
  grupoEtnico: GrupoEtnico;
  discapacidad: Discapacidad;
  condicionSalud: CondicionSalud;
  healthNotes: string;
  isPregnant: boolean;
  isLactating: boolean;
  isMinorUnaccompanied: boolean;
  createdAt: string;
}

export interface CensusWizardState {
  eventType: EdanEventType | '';
  eventDate: string;
  departamento: string;
  municipio: string;
  zone: ZoneType;
  zoneName: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  numberOfFamilies: number;
  housingType: HousingVisit['housingType'];
  ownershipType: HousingVisit['ownershipType'];
  waterAffected: boolean;
  sewerAffected: boolean;
  electricityAffected: boolean;
  families: WizardFamily[];
  damageAggregate: HousingDamageAggregate;
  damageStructural: HousingDamageStructural | '';
  damageNotes: string;
  affectedGoods: AffectedGood[];
  consentGranted: boolean;
}

export interface WizardFamily {
  id: string;
  persons: WizardPerson[];
  needs: NeedCategory[];
  needNotes: string;
}

export interface WizardPerson {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sexo: Sexo;
  parentesco: Parentesco;
  grupoEtnico: GrupoEtnico;
  discapacidad: Discapacidad;
  condicionSalud: CondicionSalud;
  healthNotes: string;
  isPregnant: boolean;
  isLactating: boolean;
  isMinorUnaccompanied: boolean;
}

export interface RescuerProfile {
  id: string;
  name: string;
  cmgrdAccreditation: string;
  entity: string;
  assignedMunicipio: string;
  assignedZone: string;
  phone: string;
}

export interface CalamityDeclaration {
  id: string;
  municipio: string;
  departamento: string;
  declarationDate: string;
  expiryDate: string;
  decretoNumber: string;
  active: boolean;
}

export interface RescuerDashboardStats {
  totalVisitsToday: number;
  totalFamilies: number;
  totalPersons: number;
  pendingSync: number;
}

// === Socorro (Organismos de Socorro) Types ===

export type Habitability = 'habitable' | 'uso_restringido' | 'no_habitable';

export const HABITABILITY_LABELS: Record<Habitability, string> = {
  habitable: 'Habitable',
  uso_restringido: 'Uso restringido',
  no_habitable: 'No habitable',
};

export type IncidentStatus = 'en_atencion' | 'controlado' | 'cerrado';

export interface SocorroProfile {
  id: string;
  name: string;
  entity: 'bomberos' | 'defensa_civil' | 'cruz_roja';
  badge: string;
  assignedMunicipio: string;
  assignedDepartamento: string;
  phone: string;
}

export const SOCORRO_ENTITY_LABELS: Record<SocorroProfile['entity'], string> = {
  bomberos: 'Cuerpo de Bomberos',
  defensa_civil: 'Defensa Civil Colombiana',
  cruz_roja: 'Cruz Roja Colombiana',
};

export interface IncidentLog {
  id: string;
  socorroId: string;
  linkedReportId?: string;
  eventType: EdanEventType;
  eventDate: string;
  departamento: string;
  municipio: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  personsInjured: number;
  personsDead: number;
  personsMissing: number;
  personsEvacuated: number;
  familiesAffected: number;
  status: IncidentStatus;
  createdAt: string;
}

export interface HabitabilityAssessment {
  id: string;
  incidentLogId: string;
  socorroId: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  housingType: 'casa' | 'apartamento' | 'habitacion' | 'improvisada' | 'otro';
  habitability: Habitability;
  damageAggregate: HousingDamageAggregate;
  needsStructuralInspection: boolean;
  occupantsPresent: number;
  notes: string;
  evacuationNotificationIssued: boolean;
  temporaryShelterActivated: boolean;
  createdAt: string;
}

export interface SocorroDashboardStats {
  incidentsToday: number;
  incidentsActive: number;
  assessmentsToday: number;
  personsEvacuated: number;
  housingsNotHabitable: number;
  housingsRestricted: number;
}
