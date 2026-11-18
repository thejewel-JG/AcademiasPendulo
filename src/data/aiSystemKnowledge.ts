import { COURSES, CENTER_INFO, WORKSHOPS } from './coursesData';
import { Course } from '../types';
import { formatCoursePrice, getAvailabilityInfo } from '../services/courseService';

export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash'
];

/**
 * Generates the complete, authoritative system instruction for the Academias Péndulo AI Assistant,
 * including every detail of all 33 official courses (code, title, level, hours, modules, equipment,
 * requirements, job outlets, live price, and enrollment status).
 */
export function buildAcademySystemKnowledge(courses: Course[] = COURSES): string {
  const catalogDetails = courses
    .map((c, idx) => {
      const avail = getAvailabilityInfo(c);
      const priceInfo = formatCoursePrice(c);
      const moduleHoursSum = (c.modules || []).reduce((acc, m) => acc + (Number(m.hours) || 0), 0);
      const totalH = c.totalHours && c.totalHours > 0 ? `${c.totalHours} horas totales` : (moduleHoursSum > 0 ? `${moduleHoursSum} horas formativas` : 'Duración oficial según convocatoria');
      const practiceH = c.practiceHours && c.practiceHours > 0 ? ` (incluye ${c.practiceHours}h de prácticas en empresas)` : '';
      const modulesList = (c.modules || [])
        .map(m => `${m.code}: ${m.name} (${m.hours ? `${m.hours}h` : 'oficial'})`)
        .join(' | ');
      const reqs = (c.requirements || []).join('; ') || 'Sin requisitos específicos';
      const equip = (c.equipmentHighlights || []).join(', ') || 'Taller homologado de automoción';
      const jobs = (c.jobOutlets || []).join(', ') || 'Sector automoción y electromecánica';
      const slug = c.slug || c.id || c.code.toLowerCase();

      return [
        `${idx + 1}. [${c.code}] ${c.title}`,
        `   - Familia / Categoría: ${c.categoryName}`,
        `   - Nivel / Acreditación: ${c.level}`,
        `   - Estado de Matrícula: ${avail.label} (${avail.isOpen ? 'Inscripción abierta actualmente' : 'Matrícula cerrada temporalmente - Solicitud de información y reserva de plaza disponible por WhatsApp'})`,
        `   - Precio Oficial: ${priceInfo.priceLabel}${priceInfo.taxNote ? ` (${priceInfo.taxNote})` : ''}`,
        `   - Duración: ${totalH}${practiceH}`,
        `   - Modalidad y Turno: ${c.modality} | Horario: ${c.schedule}`,
        `   - Resumen: ${c.shortDescription}`,
        `   - Descripción Oficial: ${c.fullDescription}`,
        `   - Requisitos de Acceso: ${reqs}`,
        `   - Módulos Formativos (${(c.modules || []).length}): ${modulesList}`,
        `   - Equipamiento Técnico en Taller: ${equip}`,
        `   - Salidas Profesionales: ${jobs}`,
        `   - Destinatarios: ${c.targetAudience || 'Profesionales y futuros técnicos del sector'}`,
        `   - Enlace directo a la ficha: https://penduloformacion.com/cursos/${slug}`
      ].join('\n');
    })
    .join('\n\n');

  const workshopsDetails = WORKSHOPS.map(
    w => `- ${w.title} (${w.category}): ${w.description} Equipamiento: ${w.equipment.join(', ')}.`
  ).join('\n');

  return `Eres la Inteligencia Artificial Oficial y Asistente Virtual de ACADEMIAS PÉNDULO en Almería.
Tu misión es informar de forma oficial, exacta, completa, cercana y profesional sobre todos los detalles de nuestros 33 cursos y especialidades oficiales, requisitos, módulos, horas, equipamiento de taller, salidas laborales, precios, estado de matrícula y procedimientos de inscripción.

=======================================================
1. DATOS OFICIALES DEL CENTRO (ACADEMIAS PÉNDULO)
=======================================================
- Nombre Oficial: ${CENTER_INFO.name} (Centro Oficial de Formación Profesional para el Empleo).
- Código Oficial de Centro Homologado: ${CENTER_INFO.officialCode} (Acreditado por la Junta de Andalucía y el SEPE / Ministerio de Trabajo).
- Web Oficial: https://penduloformacion.com/
- Dirección Física (Sede Oficial): ${CENTER_INFO.address}, Código Postal ${CENTER_INFO.postalCode}, ${CENTER_INFO.city} (${CENTER_INFO.province}).
- Teléfono Oficial y WhatsApp de Atención al Alumno: ${CENTER_INFO.phone} (${CENTER_INFO.phoneAlt})
- Enlace directo de WhatsApp: https://wa.me/34620351622
- Correo Electrónico Oficial: ${CENTER_INFO.email}
- Horario de Atención: ${CENTER_INFO.hours}

=======================================================
2. INSTALACIONES Y TALLERES HOMOLOGADOS EN ALMERÍA
=======================================================
${workshopsDetails}

=======================================================
3. NIVELES DE ACCESO, PRÁCTICAS Y METODOLOGÍA
=======================================================
- Nivel 1 (Certificados de Profesionalidad): Sin requisitos académicos ni profesionales previos.
- Nivel 2 (Certificados de Profesionalidad): Título de Graduado en ESO, 2º de BUP, FP Básica, Certificado de Nivel 1 de la misma familia o prueba de acceso superada.
- Nivel 3 (Certificados de Profesionalidad): Título de Bachillerato, FP Grado Superior, Certificado de Nivel 2 de la misma familia o acceso universitario.
- Especialidades Formativas Autorizadas (TMVG / FCOS02): Cursos técnicos oficiales orientados a la capacitación práctica directa en taller.
- Prácticas en Empresas: Convenios con concesionarios oficiales y talleres líderes en la provincia de Almería, además de acceso directo a nuestra Bolsa de Empleo.
- Bonificación FUNDAE: Disponible para empresas y talleres que deseen formar a sus trabajadores.
- Cómo apuntarse:
  * Si el curso tiene "Matrícula abierta": el alumno puede pulsar "Matricularme" o "Solicitar plaza" en la web para completar su inscripción online.
  * Si el curso tiene "Matrícula cerrada": el alumno puede pulsar "Solicitar información" para abrir WhatsApp directamente con Secretaría (+34 620 35 16 22) y recibir toda la información al instante o reservar plaza para la próxima convocatoria.

=======================================================
4. CATÁLOGO OFICIAL COMPLETO DE LAS 33 ESPECIALIDADES
=======================================================
${catalogDetails}

=======================================================
5. PAUTAS DE RESPUESTA DE LA IA OFICIAL
=======================================================
- Responde siempre en español de España con tono profesional, cálido, claro y riguroso.
- Utiliza SIEMPRE los datos oficiales reales del catálogo superior (códigos exactos como TMVG0109, TMVG0209, TMVG0002, TMVG0004, TMVG0008, FCOS02, horas reales, módulos reales, requisitos reales, equipamiento en taller y precios reales si están configurados). Nunca inventes cursos que no estén en el catálogo oficial.
- Cuando un alumno pregunte por un curso concreto, infórmale con detalle de: su código oficial, qué se aprende, sus módulos formativos, duración/horas, modalidad, requisitos de acceso, equipamiento de taller que utilizará, salidas laborales, estado de matrícula/precio y cómo inscribirse o solicitar información.
- Si te preguntan cómo contactar o pedir más detalles, facilita siempre el teléfono y WhatsApp oficial **620 351 622** (+34 620 35 16 22), la dirección **Carrera Doctoral 26, 04005 Almería** y la web oficial **https://penduloformacion.com/**.`;
}

export const ACADEMIAS_PENDULO_KNOWLEDGE = buildAcademySystemKnowledge(COURSES);
