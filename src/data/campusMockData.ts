import {
  UserProfile,
  CampusCourse,
  Enrollment,
  QuestionThread,
  SecretaryRequest,
  Announcement,
} from '../types/campus';
import { COURSES } from './coursesData';

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'usr-student-1',
    nombre: 'Alejandro',
    apellidos: 'García Pérez',
    email: 'alumno@pendulo.es',
    telefono: '612 345 678',
    role: 'ALUMNO',
    activo: true,
    fechaAlta: '2026-01-15',
  },
  {
    id: 'usr-teacher-1',
    nombre: 'Carlos',
    apellidos: 'Martínez López',
    email: 'profesor@pendulo.es',
    telefono: '633 987 654',
    role: 'PROFESOR',
    activo: true,
    fechaAlta: '2025-09-01',
  },
  {
    id: 'usr-teacher-2',
    nombre: 'Manuel',
    apellidos: 'Ramos Gil',
    email: 'mramos@academiaspendulo.com',
    telefono: '655 11 22 33',
    role: 'PROFESOR',
    activo: true,
    fechaAlta: '2025-10-01',
  },
  {
    id: 'usr-admin-1',
    nombre: 'Elena',
    apellidos: 'Sánchez Ruiz',
    email: 'admin@pendulo.es',
    telefono: '950 25 25 25',
    role: 'ADMINISTRACION',
    activo: true,
    fechaAlta: '2025-01-01',
  },
];

// Map ALL 33 official specialties from coursesData into Campus Virtual courses
export const MOCK_COURSES: CampusCourse[] = COURSES.map((c, idx) => {
  const teacherId = idx % 2 === 0 ? 'usr-teacher-1' : 'usr-teacher-2';
  const teacherName = idx % 2 === 0 ? 'Prof. Carlos Martínez López' : 'Prof. Manuel Ramos Gil';

  return {
    id: c.code,
    codigo: c.code,
    nombre: c.title,
    descripcion: c.fullDescription || c.shortDescription,
    imagen: c.imageUrl,
    profesorNombre: teacherName,
    profesorId: teacherId,
    modulos: (c.modules || []).map((m, mIdx) => ({
      id: `mod_${c.code.toLowerCase()}_${mIdx + 1}`,
      cursoId: c.code,
      titulo: `Módulo ${mIdx + 1}: ${m.name}`,
      orden: mIdx + 1,
      lecciones: [
        {
          id: `les_${c.code.toLowerCase()}_${mIdx + 1}_1`,
          moduloId: `mod_${c.code.toLowerCase()}_${mIdx + 1}`,
          titulo: `1.1 Fundamentos y Normativa Práctica de ${c.title}`,
          descripcion: `Protocolos de seguridad y operaciones de taller homologado para ${c.title}.`,
          duracion: `${m.hours} horas`,
          orden: 1,
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          contenidoHtml: `
            <h4>Programa Oficial de la Especialidad ${c.code}</h4>
            <p>${c.fullDescription}</p>
            <h5>Prácticas en Taller Homologado (Centro 0400030892):</h5>
            <ul>
              ${(c.equipmentHighlights || ['Equipamiento y maquetas homologadas CE']).map((h) => `<li>${h}</li>`).join('')}
            </ul>
          `,
          recursos: [
            {
              id: `res_${c.code.toLowerCase()}_1`,
              cursoId: c.code,
              moduloId: `mod_${c.code.toLowerCase()}_${mIdx + 1}`,
              titulo: `Dossier Técnico ${c.code} - ${c.title}.pdf`,
              descripcion: `Manual y temario oficial de la especialidad autorizada por la Junta de Andalucía el 09/06/2026.`,
              tipo: 'PDF',
              urlPrivada: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              tamano: '4.2 MB',
              permitirDescarga: true,
              publicado: true,
              creadoPor: teacherName.replace('Prof. ', ''),
              fechaCreacion: '2026-06-09T09:00:00Z',
            },
          ],
        },
      ],
    })),
  };
});

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enr-1',
    estudianteId: 'usr-student-1',
    cursoId: 'TMVG0004',
    fechaMatricula: '2026-02-01',
    estado: 'active',
    progresoCalculado: 42,
    ultimaLeccionId: 'les_tmvg0004_1_1',
  },
  {
    id: 'enr-2',
    estudianteId: 'usr-student-1',
    cursoId: 'TMVG0209',
    fechaMatricula: '2026-03-01',
    estado: 'active',
    progresoCalculado: 15,
    ultimaLeccionId: 'les_tmvg0209_1_1',
  },
  {
    id: 'enr-3',
    estudianteId: 'usr-student-1',
    cursoId: 'FCOS02',
    fechaMatricula: '2026-06-09',
    estado: 'active',
    progresoCalculado: 60,
    ultimaLeccionId: 'les_fcos02_1_1',
  },
  {
    id: 'enr-4',
    estudianteId: 'usr-student-1',
    cursoId: 'TMVG0022',
    fechaMatricula: '2026-06-09',
    estado: 'active',
    progresoCalculado: 25,
    ultimaLeccionId: 'les_tmvg0022_1_1',
  },
];

export const MOCK_EMAIL_THREADS: any[] = [
  {
    id: 'th-1',
    external_thread_id: 'gmail-th-882194',
    subject: 'Consulta sobre plaza en TMVG0004 Mantenimiento de Vehículos Híbridos',
    status: 'PENDIENTE',
    related_request_id: 'req-001',
    related_course_id: 'TMVG0004',
    last_message_at: '2026-09-14T00:35:00Z',
    sender_name: 'María López',
    sender_email: 'maria.lopez@email.es',
    messages: [
      {
        id: 'msg-101',
        thread_id: 'th-1',
        external_message_id: 'gmail-msg-001',
        sender_name: 'María López',
        sender_email: 'maria.lopez@email.es',
        recipient_email: 'info@academiaspendulo.com',
        subject: 'Consulta sobre plaza en TMVG0004 Mantenimiento de Vehículos Híbridos',
        body: 'Hola buenas tardes, desearía consultar la disponibilidad de plaza para la especialidad autorizada TMVG0004 en las instalaciones de Carrera Doctoral 26.',
        received_at: '2026-09-14T00:35:00Z',
        direction: 'inbound',
        read: false,
      },
    ],
  },
  {
    id: 'th-2',
    external_thread_id: 'gmail-th-993012',
    subject: 'RE: Certificado oficial de asistencia a talleres presenciales',
    status: 'RESPONDIDO',
    related_student_id: 'usr-student-1',
    related_course_id: 'TMVG0004',
    last_message_at: '2026-09-13T11:20:00Z',
    sender_name: 'Alejandro García Pérez',
    sender_email: 'alumno@pendulo.es',
    messages: [
      {
        id: 'msg-201',
        thread_id: 'th-2',
        external_message_id: 'gmail-msg-002',
        sender_name: 'Alejandro García Pérez',
        sender_email: 'alumno@pendulo.es',
        recipient_email: 'secretaria@academiaspendulo.com',
        subject: 'Certificado oficial de asistencia a talleres presenciales',
        body: 'Estimada Secretaría, desearía solicitar el certificado oficial del módulo superado en el taller de automoción.',
        received_at: '2026-09-13T10:15:00Z',
        direction: 'inbound',
        read: true,
      },
      {
        id: 'msg-202',
        thread_id: 'th-2',
        external_message_id: 'gmail-msg-003',
        sender_name: 'Secretaría Academias Péndulo',
        sender_email: 'secretaria@academiaspendulo.com',
        recipient_email: 'alumno@pendulo.es',
        subject: 'RE: Certificado oficial de asistencia a talleres presenciales',
        body: 'Estimado Alejandro, dispones del documento de acreditación firmado en el área de Secretaría Online.',
        received_at: '2026-09-13T11:20:00Z',
        direction: 'outbound',
        read: true,
      },
    ],
  },
];

export const MOCK_QUESTIONS: QuestionThread[] = [
  {
    id: 'q-1',
    estudianteId: 'usr-student-1',
    estudianteNombre: 'Alejandro García Pérez',
    profesorId: 'usr-teacher-1',
    cursoId: 'TMVG0004',
    cursoNombre: 'TMVG0004 - Mantenimiento de Vehículos Híbridos',
    moduloUnidad: 'Módulo 1 / Unidad 1.1',
    asunto: 'Duda sobre el protocolo de aislamiento CAT IV 1000V',
    estado: 'RESPONDIDA',
    fechaCreacion: '2026-06-10T10:30:00Z',
    fechaUltimaActualizacion: '2026-06-10T11:15:00Z',
    mensajes: [
      {
        id: 'qmsg-1',
        autorId: 'usr-student-1',
        autorNombre: 'Alejandro García Pérez',
        autorRol: 'ALUMNO',
        texto: 'Hola Profesor, en las prácticas de taller de vehículos híbridos, ¿es obligatoria la medición de ausencia de tensión antes de manipular la batería de tracción?',
        fechaHora: '2026-06-10T10:30:00Z',
      },
      {
        id: 'qmsg-2',
        autorId: 'usr-teacher-1',
        autorNombre: 'Carlos Martínez López',
        autorRol: 'PROFESOR',
        texto: 'Hola Alejandro. Sí, es un requisito estricto de prevención de riesgos laborales. Debemos utilizar guantes aislantes dieléctricos y multímetro comprobado antes de tocar componentes de alta tensión.',
        fechaHora: '2026-06-10T11:15:00Z',
      },
    ],
  },
];

export const MOCK_SECRETARY_REQUESTS: SecretaryRequest[] = [
  {
    id: 'sec-1',
    referencia: 'SEC-2026-8812',
    estudianteId: 'usr-student-1',
    estudianteNombre: 'Alejandro García Pérez',
    tipo: 'Solicitud de certificado',
    asunto: 'Certificado de horas presenciales en Especialidad TMVG0004',
    descripcion: 'Solicitud de expedición de justificante oficial de horas realizadas en taller para el expediente personal.',
    estado: 'EN_TRAMITE',
    fechaCreacion: '2026-06-12T09:00:00Z',
    fechaUltimaActualizacion: '2026-06-12T14:20:00Z',
    mensajes: [
      {
        id: 'secmsg-1',
        autorId: 'usr-student-1',
        autorNombre: 'Alejandro García Pérez',
        autorRol: 'ALUMNO',
        texto: 'Adjunto solicitud formal para el certificado oficial de la especialidad.',
        fechaHora: '2026-06-12T09:00:00Z',
      },
      {
        id: 'secmsg-2',
        autorId: 'usr-admin-1',
        autorNombre: 'Elena Sánchez (Secretaría)',
        autorRol: 'ADMINISTRACION',
        texto: 'Solicitud tramitada correctamente. El documento en PDF está en revisión por Jefatura de Estudios.',
        fechaHora: '2026-06-12T14:20:00Z',
      },
    ],
  },
];

// Clean & official announcements for Academias Péndulo
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    titulo: 'Oferta Formativa Oficial: 33 Especialidades Autorizadas por la Junta de Andalucía',
    contenido:
      'ACADEMIAS PÉNDULO (Centro Autorizado 0400030892) cuenta con 33 especialidades en su oferta formativa en la familia de Transporte y Mantenimiento de Vehículos y Formación Complementaria en sus instalaciones de Carrera Doctoral 26 (Almería).',
    autorNombre: 'Secretaría Académica Péndulo',
    autorId: 'usr-admin-1',
    destinatarios: 'TODOS',
    fecha: '2026-06-09T09:00:00Z',
  },
  {
    id: 'ann-2',
    titulo: 'Prácticas en Taller Homologado y Equipamiento de Diagnosis Avanzada',
    contenido:
      'Las sesiones prácticas se realizan con equipamiento real: osciloscopios PicoScope, equipos de diagnosis Bosch KTS, sistemas de calibración ADAS multimarca y maquetas de alta tensión.',
    autorNombre: 'Dirección Técnica',
    autorId: 'usr-admin-1',
    destinatarios: 'ALUMNOS',
    fecha: '2026-06-10T10:00:00Z',
  },
  {
    id: 'ann-3',
    titulo: 'Horario de Atención de Secretaría Online y Telefónica',
    contenido:
      'Secretaría presta atención ininterrumpida de Lunes a Viernes de 08:30 a 20:30 h en Carrera Doctoral 26, Almería. Teléfono: +34 950 25 25 25 | WhatsApp: +34 950 04 04 04.',
    autorNombre: 'Secretaría Académica Péndulo',
    autorId: 'usr-admin-1',
    destinatarios: 'TODOS',
    fecha: '2026-06-11T11:00:00Z',
  },
];

export const MOCK_CONTACT_REQUESTS: any[] = [
  {
    id: 'req-001',
    created_at: '2026-09-13T20:15:00Z',
    first_name: 'Lucía',
    last_name: 'Mendoza Ruiz',
    email: 'lucia.mendoza@email.es',
    phone: '655 44 33 22',
    course_id: 'TMVG0004',
    course_code: 'TMVG0004',
    course_name: 'Mantenimiento de Vehículos Híbridos',
    preferred_schedule: 'Mañanas (09:00 - 14:00)',
    employment_status: 'Empleado sector automoción',
    comments: 'Solicito información sobre las inscripciones autorizadas el 09/06/2026.',
    message: 'Hola, me gustaría saber la fecha de inicio del próximo grupo en taller de Almería.',
    status: 'new',
    source: 'Formulario Web Principal',
  },
  {
    id: 'req-002',
    created_at: '2026-09-12T16:40:00Z',
    first_name: 'Marcos',
    last_name: 'Navarro Fernández',
    email: 'marcos.navarro@email.es',
    phone: '611 22 33 44',
    course_id: 'TMVG0209',
    course_code: 'TMVG0209',
    course_name: 'Mantenimiento de los Sistemas Eléctricos y Electrónicos de Vehículos',
    preferred_schedule: 'Tardes (16:00 - 21:00)',
    employment_status: 'Desempleado',
    comments: 'Interesado en la convocatoria del Certificado Nivel 2.',
    message: 'Quisiera conocer el calendario presencial en Almería.',
    status: 'contacted',
    assigned_admin_name: 'Elena Sánchez',
    internal_notes: 'Llamada realizada el 13/09. Información sobre requisitos Nivel 2 enviada.',
    source: 'Catálogo de Especialidades',
  },
];
