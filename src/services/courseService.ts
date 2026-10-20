import { Course } from '../types';
import { COURSES } from '../data/coursesData';

/**
 * Merge static catalog definitions (descriptions, images, modules)
 * with dynamic commercial data retrieved from MySQL database (especialidades table).
 */
export function mergeCourseWithCommercialData(staticCourse: Course, dbData?: any): Course {
  if (!dbData) {
    return {
      ...staticCourse,
      precio_base: null,
      moneda: 'EUR',
      tipo_iva: 'EXENTO',
      porcentaje_iva: 0.00,
      importe_iva: null,
      precio_final: null,
      estado_precio: 'SIN_CONFIGURAR',
      tipo_inscripcion: 'SOLICITUD_APROBACION',
      plazas_maximas: null,
      plazas_disponibles: staticCourse.placesLeft ?? 15,
      estado_disponibilidad: 'ABIERTA',
      fecha_apertura_inscripcion: null,
      fecha_cierre_inscripcion: null,
      estado_publicacion: 'PUBLICADO',
    };
  }

  const precioFinalNum = dbData.precio_final !== null && dbData.precio_final !== undefined
    ? Number(dbData.precio_final)
    : null;

  const precioBaseNum = dbData.precio_base !== null && dbData.precio_base !== undefined
    ? Number(dbData.precio_base)
    : null;

  const importeIvaNum = dbData.importe_iva !== null && dbData.importe_iva !== undefined
    ? Number(dbData.importe_iva)
    : null;

  return {
    ...staticCourse,
    precio_base: precioBaseNum,
    moneda: dbData.moneda || 'EUR',
    tipo_iva: dbData.tipo_iva || 'EXENTO',
    porcentaje_iva: dbData.porcentaje_iva !== undefined ? Number(dbData.porcentaje_iva) : 0.00,
    importe_iva: importeIvaNum,
    precio_final: precioFinalNum,
    estado_precio: dbData.estado_precio || (precioFinalNum !== null ? 'CONFIGURADO' : 'SIN_CONFIGURAR'),
    tipo_inscripcion: dbData.tipo_inscripcion || 'SOLICITUD_APROBACION',
    plazas_maximas: dbData.plazas_maximas !== null && dbData.plazas_maximas !== undefined ? Number(dbData.plazas_maximas) : null,
    plazas_disponibles: dbData.plazas_disponibles !== null && dbData.plazas_disponibles !== undefined ? Number(dbData.plazas_disponibles) : (staticCourse.placesLeft ?? 15),
    estado_disponibilidad: dbData.estado_disponibilidad || 'ABIERTA',
    fecha_apertura_inscripcion: dbData.fecha_apertura_inscripcion || null,
    fecha_cierre_inscripcion: dbData.fecha_cierre_inscripcion || null,
    estado_publicacion: dbData.estado_publicacion || 'PUBLICADO',
  };
}

/**
 * Fetch all public courses from backend and return combined catalog
 */
export async function fetchPublicCoursesWithCommercial(): Promise<Course[]> {
  try {
    const res = await fetch('/api/public/courses');
    if (!res.ok) {
      return COURSES.map(c => mergeCourseWithCommercialData(c));
    }
    const dbList: any[] = await res.json();
    const dbMap = new Map<string, any>();
    dbList.forEach(item => {
      if (item.id) dbMap.set(item.id.toLowerCase(), item);
      if (item.codigo) dbMap.set(item.codigo.toLowerCase(), item);
    });

    return COURSES.map(c => {
      const match = dbMap.get(c.id.toLowerCase()) || dbMap.get(c.code.toLowerCase());
      return mergeCourseWithCommercialData(c, match);
    });
  } catch (err) {
    console.warn('Error loading dynamic courses, falling back to static:', err);
    return COURSES.map(c => mergeCourseWithCommercialData(c));
  }
}

/**
 * Format course price for display.
 * Returns formatted price with EUR, e.g. "950,00 €" or "Consultar precio"
 */
export function formatCoursePrice(course: Course): { priceLabel: string; isConfigured: boolean; taxNote: string } {
  if (course.estado_precio === 'CONFIGURADO' && course.precio_final !== null && course.precio_final !== undefined && !isNaN(course.precio_final)) {
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: course.moneda || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(course.precio_final);

    let taxNote = 'IVA exento';
    if (course.tipo_iva === 'GENERAL_21') taxNote = 'IVA (21%) incluido';
    else if (course.tipo_iva === 'REDUCIDO_10') taxNote = 'IVA (10%) incluido';
    else if (course.tipo_iva === 'SUPERREDUCIDO_4') taxNote = 'IVA (4%) incluido';

    return {
      priceLabel: formatted,
      isConfigured: true,
      taxNote
    };
  }

  return {
    priceLabel: 'Consultar precio',
    isConfigured: false,
    taxNote: 'Precio personalizado según plazas y convocatoria'
  };
}

/**
 * Get display badge for course availability
 */
export function getAvailabilityInfo(course: Course): { label: string; badgeClass: string; isOpen: boolean } {
  switch (course.estado_disponibilidad) {
    case 'CERRADA':
      return {
        label: 'Inscripciones cerradas',
        badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        isOpen: false
      };
    case 'SUSPENDIDA_TEMPORALMENTE':
      return {
        label: 'Matrícula suspendida temporalmente',
        badgeClass: 'bg-amber-900/60 text-amber-300 border-amber-800',
        isOpen: false
      };
    case 'COMPLETA':
      return {
        label: 'Plazas completas',
        badgeClass: 'bg-rose-900/60 text-rose-300 border-rose-800',
        isOpen: false
      };
    case 'ABIERTA':
    default:
      return {
        label: 'Inscripción Abierta',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
        isOpen: true
      };
  }
}
