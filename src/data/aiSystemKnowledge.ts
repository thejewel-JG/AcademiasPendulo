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

function normalizeSearch(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDetailedCourseBlock(c: Course): string {
  const avail = getAvailabilityInfo(c);
  const priceInfo = formatCoursePrice(c);
  const moduleHoursSum = (c.modules || []).reduce((acc, m) => acc + (Number(m.hours) || 0), 0);
  const totalH = c.totalHours && c.totalHours > 0
    ? `${c.totalHours} horas`
    : (moduleHoursSum > 0 ? `${moduleHoursSum} horas` : 'Según convocatoria oficial');
  const practiceH = c.practiceHours && c.practiceHours > 0 ? ` (incluye ${c.practiceHours}h de prácticas en empresas)` : '';
  const mods = (c.modules || [])
    .map(m => `${m.code}: ${m.name}${m.hours ? ` (${m.hours}h)` : ''}`)
    .join(' · ');
  const reqs = (c.requirements || []).join(' ') || 'Sin requisitos previos';
  const equip = (c.equipmentHighlights || []).join(', ') || 'Taller homologado en Carrera Doctoral 26';
  const jobs = (c.jobOutlets || []).join(', ') || 'Talleres y concesionarios de automoción';

  return [
    `**[${c.code}] ${c.title}**`,
    `• **Nivel / Acreditación:** ${c.level}`,
    `• **Estado de matrícula:** **${avail.label}**`,
    `• **Precio oficial:** ${priceInfo.priceLabel}${priceInfo.taxNote ? ` (${priceInfo.taxNote})` : ''}`,
    `• **Duración y Modalidad:** ${totalH}${practiceH} · ${c.modality} (${c.schedule})`,
    `• **Descripción:** ${c.shortDescription}`,
    `• **Módulos formativos:** ${mods}`,
    `• **Requisitos de acceso:** ${reqs}`,
    `• **Equipamiento en taller:** ${equip}`,
    `• **Salidas profesionales:** ${jobs}`
  ].join('\n');
}

/**
 * Intelligent Official Course Advisor Engine that guarantees an authoritative, complete answer
 * with 100% real course data from the 33 specialties catalog even if the remote API is unreachable.
 */
export function generateOfficialAcademyReply(userQuery: string, courses: Course[] = COURSES): string {
  const q = normalizeSearch(userQuery);
  const openCourses = courses.filter(c => getAvailabilityInfo(c).isOpen);

  // 1. Direct course code or title/keyword match
  const stopWords = new Set(['hola', 'buenas', 'quiero', 'saber', 'informacion', 'sobre', 'curso', 'cursos', 'del', 'las', 'los', 'para', 'como', 'que', 'cual', 'cuales', 'teneis', 'hay', 'dame', 'todos', 'detalles', 'oficiales', 'academias', 'pendulo']);
  const tokens = q.split(' ').filter(t => t.length >= 3 && !stopWords.has(t));

  const scored = courses.map(course => {
    let score = 0;
    const codeNorm = normalizeSearch(course.code);
    const titleNorm = normalizeSearch(course.title);
    const descNorm = normalizeSearch(`${course.shortDescription} ${course.fullDescription} ${(course.equipmentHighlights || []).join(' ')} ${course.level}`);

    if (q.includes(codeNorm)) score += 100;
    if (titleNorm.length > 5 && q.includes(titleNorm)) score += 80;

    for (const tok of tokens) {
      if (codeNorm.includes(tok)) score += 40;
      if (titleNorm.includes(tok)) score += 15;
      else if (descNorm.includes(tok)) score += 5;
    }

    // Topic synonyms
    if ((q.includes('hibrid') || q.includes('electric') || q.includes('alta tension') || q.includes('bateria')) && ['TMVG0004', 'TMVG03', 'TMVG05', 'TMVG06', 'TMVG07'].includes(course.code)) {
      score += 25;
    }
    if ((q.includes('adas') || q.includes('osciloscopio') || q.includes('diagnosis') || q.includes('radar') || q.includes('averia')) && ['TMVG0008', 'TMVG004PO', 'TMVG007PO', 'TMVG04', 'TMVG08', 'TMVG0072', 'TMVG13'].includes(course.code)) {
      score += 25;
    }
    if ((q.includes('moto') || q.includes('biciclet') || q.includes('patinet') || q.includes('vmp')) && ['TMVG0064', 'TMVG0067', 'TMVG0070', 'TMVG12', 'TMVG14'].includes(course.code)) {
      score += 25;
    }
    if ((q.includes('prl') || q.includes('prevencion') || q.includes('riesgos')) && course.code === 'FCOS02') {
      score += 60;
    }
    if ((q.includes('certificado') || q.includes('sepe') || q.includes('oficial') || q.includes('nivel 1') || q.includes('nivel 2')) && ['TMVG0109', 'TMVG0209', 'TMVG0309', 'TMVG0409', 'TMVG0110'].includes(course.code)) {
      score += 20;
    }
    if ((q.includes('sin estudios') || q.includes('sin requisitos') || q.includes('desde cero') || q.includes('nivel 1') || q.includes('iniciacion')) && ['TMVG0109', 'TMVG0002', 'FCOS02'].includes(course.code)) {
      score += 25;
    }

    return { course, score };
  }).filter(item => item.score >= 15).sort((a, b) => b.score - a.score);

  // Contact / Location / Hours question
  if ((q.includes('donde') || q.includes('direccion') || q.includes('ubicacion') || q.includes('telefono') || q.includes('whatsapp') || q.includes('horario') || q.includes('contacto')) && scored.length === 0) {
    return [
      `📍 **Datos Oficiales de Contacto y Sede — ACADEMIAS PÉNDULO (Centro Homologado Nº ${CENTER_INFO.officialCode}):**`,
      `• **Dirección Oficial:** ${CENTER_INFO.address}, CP ${CENTER_INFO.postalCode}, ${CENTER_INFO.city} (${CENTER_INFO.province}).`,
      `• **Teléfono y WhatsApp Oficial:** **${CENTER_INFO.phone}** (${CENTER_INFO.phoneAlt})`,
      `• **Correo Electrónico:** ${CENTER_INFO.email}`,
      `• **Horario de Atención:** ${CENTER_INFO.hours}`,
      `• **Web Oficial:** https://penduloformacion.com/`,
      `\n¿Sobre cuál de nuestras **33 especialidades oficiales** de Automoción, Vehículos Híbridos y Eléctricos, Diagnosis ADAS o PRL quieres que te dé todos los detalles?`
    ].join('\n');
  }

  // Open enrollment / prices question
  if ((q.includes('abierta') || q.includes('plaza') || q.includes('matricular') || q.includes('apuntar')) && scored.length === 0) {
    const topOpen = (openCourses.length > 0 ? openCourses : courses).slice(0, 4);
    return [
      `🎓 **Formaciones con Matrícula Abierta y Destacadas en Academias Péndulo (Centro Nº ${CENTER_INFO.officialCode}):**`,
      '',
      ...topOpen.map(c => formatDetailedCourseBlock(c)),
      '',
      `Además, contamos con un catálogo total de **33 especialidades oficiales**. Para los cursos con *Matrícula abierta* puedes pulsar **"Matricularme"** o **"Solicitar plaza"** directamente en la tarjeta del curso; y para los de *Matrícula cerrada* puedes pulsar **"Solicitar información"** para abrir WhatsApp con Secretaría (**${CENTER_INFO.phone}**) y recibir todos los detalles al instante.`
    ].join('\n\n');
  }

  // Specific matched courses (show up to 3 in full detail)
  if (scored.length > 0) {
    const topMatches = scored.slice(0, 3).map(s => s.course);
    return [
      `Aquí tienes toda la **información oficial detallada** de ${topMatches.length === 1 ? 'la especialidad consultada' : 'las especialidades relacionadas'} en **Academias Péndulo** (Centro Homologado Nº ${CENTER_INFO.officialCode}, ${CENTER_INFO.address}, Almería):`,
      '',
      ...topMatches.map(c => formatDetailedCourseBlock(c)),
      '',
      `📞 **¿Cómo inscribirte o ampliar información?**`,
      `• Si el curso tiene **Matrícula abierta**, pulsa en **"Matricularme"** o **"Solicitar plaza"** en su tarjeta de la web.`,
      `• También puedes escribirnos directamente por WhatsApp o llamarnos al **${CENTER_INFO.phone}** (+34 620 35 16 22) o visitarnos en **${CENTER_INFO.address}, ${CENTER_INFO.postalCode} Almería** (${CENTER_INFO.hours}).`
    ].join('\n\n');
  }

  // General catalog overview
  const featured = (openCourses.length > 0 ? openCourses : courses).slice(0, 3);
  return [
    `¡Hola! Soy la Inteligencia Artificial Oficial de **Academias Péndulo** en Almería (Centro Homologado Nº **${CENTER_INFO.officialCode}** por la Junta de Andalucía y el SEPE).`,
    `Impartimos **33 especialidades oficiales** organizadas en nuestras principales áreas técnicas:`,
    `1. **Certificados de Profesionalidad Oficiales (SEPE / BOE):** *TMVG0109* (Nivel 1 Electromecánica, 380h), *TMVG0209* (Nivel 2 Sistemas Eléctricos y Electrónicos, 520h), *TMVG0309*, *TMVG0409* y *TMVG0110* — todos con prácticas reales garantizadas en concesionarios de Almería.`,
    `2. **Vehículos Híbridos y Eléctricos (Alta Tensión):** *TMVG0004* (Mantenimiento de Vehículos Híbridos), *TMVG03*, *TMVG05*, *TMVG06* y *TMVG07*.`,
    `3. **Diagnosis Electrónica Avanzada, Osciloscopio y Sistemas ADAS:** *TMVG0008*, *TMVG004PO*, *TMVG007PO*, *TMVG04*, *TMVG08*, *TMVG0072* y *TMVG13*.`,
    `4. **Mecánica, Motor, Motocicletas, VMP y PRL:** *TMVG0002* (Introducción a la Automoción), *TMVG0021*, *TMVG0064*, *TMVG12* y *FCOS02* (Básico de Prevención de Riesgos Laborales).`,
    '',
    `**Destacados actualmente en catálogo:**`,
    ...featured.map(c => formatDetailedCourseBlock(c)),
    '',
    `Pregúntame por cualquier curso, código (ej. *TMVG0209*, *TMVG0004*, *TMVG0008*, *FCOS02*), precios, requisitos o prácticas y te daré su ficha oficial completa, o contáctanos en el **${CENTER_INFO.phone}** (${CENTER_INFO.address}, Almería).`
  ].join('\n\n');
}

export const ACADEMIAS_PENDULO_KNOWLEDGE = buildAcademySystemKnowledge(COURSES);
