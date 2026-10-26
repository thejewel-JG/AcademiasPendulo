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
      orden_visualizacion: 0,
      modificado_por_admin: null,
      slug: generateSlug(staticCourse.title),
      meta_title: `${staticCourse.title} en Almería | Academias Péndulo`,
      meta_description: staticCourse.shortDescription,
      alt_text: `Taller y formación de ${staticCourse.title} en Almería`,
      og_image: staticCourse.imageUrl,
      indexable: 1,
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

  const ordenVisualizacionNum = dbData.orden_visualizacion !== null && dbData.orden_visualizacion !== undefined
    ? Number(dbData.orden_visualizacion)
    : 0;

  return {
    ...staticCourse,
    totalHours: dbData.horas_totales !== null && dbData.horas_totales !== undefined ? Number(dbData.horas_totales) : (staticCourse.code === 'TMVG0109' ? 380 : staticCourse.code === 'TMVG0209' ? 520 : 0),
    practiceHours: dbData.horas_practicas !== null && dbData.horas_practicas !== undefined ? Number(dbData.horas_practicas) : (staticCourse.code === 'TMVG0109' || staticCourse.code === 'TMVG0209' ? staticCourse.practiceHours : 0),
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
    orden_visualizacion: ordenVisualizacionNum,
    modificado_por_admin: dbData.modificado_por_admin || null,
    slug: dbData.slug || generateSlug(staticCourse.title),
    meta_title: dbData.meta_title || `${staticCourse.title} en Almería | Academias Péndulo`,
    meta_description: dbData.meta_description || staticCourse.shortDescription,
    alt_text: dbData.alt_text || `Taller de formación de ${staticCourse.title} en Academias Péndulo Almería`,
    og_image: dbData.og_image || staticCourse.imageUrl,
    indexable: dbData.indexable !== undefined ? dbData.indexable : 1,
  };
}

/**
 * Generate a clean, SEO-friendly slug from title
 */
export function generateSlug(title: string): string {
  return (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetch a single course by slug from API
 */
export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const res = await fetch(`/api/courses/by-slug/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.course) return null;
    const dbCourse = data.course;
    const staticCourse = COURSES.find(c => c.id.toLowerCase() === dbCourse.id.toLowerCase() || c.code.toLowerCase() === dbCourse.codigo.toLowerCase()) || {
      id: dbCourse.id,
      code: dbCourse.codigo,
      title: dbCourse.nombre,
      categoryId: dbCourse.categoria_id,
      categoryName: dbCourse.categoria_id === 'tmv' ? 'Transporte y Mantenimiento de Vehículos' : 'Formación Complementaria',
      level: dbCourse.nivel || 'Especialidad Autorizada',
      totalHours: dbCourse.horas_totales || 40,
      practiceHours: dbCourse.horas_practicas || 10,
      modality: dbCourse.modalidad || 'Presencial',
      schedule: 'Flexible',
      nextCall: 'Convocatoria Abierta',
      placesLeft: dbCourse.plazas_disponibles || 15,
      shortDescription: dbCourse.descripcion || '',
      fullDescription: dbCourse.descripcion || '',
      requirements: ['Consultar requisitos con secretaría.'],
      jobOutlets: ['Inserción en el sector automotriz y talleres'],
      modules: [{ code: `MOD-${dbCourse.codigo}`, name: dbCourse.nombre, hours: dbCourse.horas_totales || 40 }],
      equipmentHighlights: ['Instalaciones y taller técnico homologado'],
      imageUrl: dbCourse.og_image || 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg',
      targetAudience: 'Alumnos y profesionales del sector.'
    };
    return mergeCourseWithCommercialData(staticCourse, dbCourse);
  } catch (err) {
    console.warn('Error in fetchCourseBySlug:', err);
    return null;
  }
}


/**
 * Fetch all public courses from backend and return combined catalog
 * strictly sorted by:
 * 1. Priority 1: Matrícula abierta first, then cerrada
 * 2. Priority 2: Manual display order (orden_visualizacion ASC)
 * 3. Priority 3: Stable tie breaker (code ASC)
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

    const merged = COURSES.map(c => {
      const match = dbMap.get(c.id.toLowerCase()) || dbMap.get(c.code.toLowerCase());
      return mergeCourseWithCommercialData(c, match);
    });

    return merged.sort((a, b) => {
      const aOpen = a.estado_disponibilidad === 'ABIERTA' ? 0 : 1;
      const bOpen = b.estado_disponibilidad === 'ABIERTA' ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;

      const aOrder = a.orden_visualizacion || 0;
      const bOrder = b.orden_visualizacion || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return a.code.localeCompare(b.code);
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
 * Get display badge for course availability (Section 2)
 * - Matrícula abierta: verde coherente
 * - Matrícula cerrada: distintivo discreto
 */
export function getAvailabilityInfo(course: Course): { label: string; badgeClass: string; isOpen: boolean } {
  switch (course.estado_disponibilidad) {
    case 'CERRADA':
    case 'SUSPENDIDA_TEMPORALMENTE':
    case 'COMPLETA':
      return {
        label: 'Matrícula cerrada',
        badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        isOpen: false
      };
    case 'ABIERTA':
    default:
      return {
        label: 'Matrícula abierta',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
        isOpen: true
      };
  }
}
