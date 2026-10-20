export interface Module {
  code: string;
  name: string;
  hours: number;
}

export interface CourseCommercialConfig {
  precio_base?: number | null;
  moneda?: string;
  tipo_iva?: 'EXENTO' | 'GENERAL_21' | 'REDUCIDO_10' | 'SUPERREDUCIDO_4' | string;
  porcentaje_iva?: number | string;
  importe_iva?: number | null;
  precio_final?: number | null;
  estado_precio?: 'SIN_CONFIGURAR' | 'CONFIGURADO';
  tipo_inscripcion?: 'COMPRA_DIRECTA' | 'SOLICITUD_APROBACION';
  plazas_maximas?: number | null;
  plazas_disponibles?: number | null;
  estado_disponibilidad?: 'ABIERTA' | 'CERRADA' | 'SUSPENDIDA_TEMPORALMENTE' | 'COMPLETA';
  fecha_apertura_inscripcion?: string | null;
  fecha_cierre_inscripcion?: string | null;
  estado_publicacion?: 'BORRADOR' | 'PUBLICADO' | 'NO_DISPONIBLE' | 'ARCHIVADO';
}

export interface Course extends CourseCommercialConfig {
  id: string;
  code: string; // e.g. TMVG0209
  title: string;
  categoryId: string;
  categoryName: string;
  level: string;
  totalHours: number;
  practiceHours: number;
  modality: string;
  schedule: string;
  nextCall: string;
  placesLeft: number;
  isSubsidized?: boolean;
  shortDescription: string;
  fullDescription: string;
  requirements: string[];
  jobOutlets: string[];
  modules: Module[];
  equipmentHighlights: string[];
  imageUrl: string;
  targetAudience: string;
}

export interface SpecialtyCategory {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  iconName: string;
  badge: string;
  description: string;
  image: string;
  coursesCount: number;
}

export interface Testimonial {
  id: string;
  name: string;
  age?: number;
  role: string;
  courseTaken: string;
  companyHired: string;
  location: string;
  text: string;
  rating: number;
  avatarUrl: string;
  year: string;
}

export interface CenterInfo {
  name: string;
  logoUrl?: string;
  officialCode: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  phoneAlt: string;
  email: string;
  hours: string;
  googleMapsUrl: string;
}
