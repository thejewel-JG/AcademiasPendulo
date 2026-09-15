import {
  UserProfile,
  CampusCourse,
  Enrollment,
  ModuleSection,
  QuestionThread,
  SecretaryRequest,
  Announcement,
} from '../types/campus';

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
    id: 'usr-admin-1',
    nombre: 'Elena',
    apellidos: 'Sánchez Ruiz',
    email: 'admin@pendulo.es',
    telefono: '950 00 00 00',
    role: 'ADMINISTRACION',
    activo: true,
    fechaAlta: '2025-01-01',
  },
];

export const MOCK_COURSES: CampusCourse[] = [
  {
    id: 'TMVG0004',
    codigo: 'TMVG0004',
    nombre: 'Mantenimiento de Vehículos Híbridos y Eléctricos',
    descripcion:
      'Capacitación técnica avanzada en protocolos de alta tensión, diagnóstico de baterías y tracción de vehículos híbridos y 100% eléctricos.',
    imagen:
      'https://images.unsplash.com/photo-1558441719-234b1a403d15?auto=format&fit=crop&w=1000&q=80',
    profesorNombre: 'Prof. Carlos Martínez López',
    profesorId: 'usr-teacher-1',
    modulos: [
      {
        id: 'mod1',
        cursoId: 'TMVG0004',
        titulo: 'Módulo 1: Seguridad y Desconexión en Alta Tensión',
        orden: 1,
        lecciones: [
          {
            id: 'les_1_1',
            moduloId: 'mod1',
            titulo: '1.1 Ropa de protección EPI y herramientas aisladas a 1000V',
            descripcion: 'Equipos requeridos para la manipulación segura de sistemas de propulsión eléctrica.',
            duracion: '45 min',
            orden: 1,
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            contenidoHtml: `
              <h4>Requisitos de Seguridad según Normativa UNE/EN</h4>
              <p>Antes de intervenir cualquier vehículo electrificado es preceptivo aplicar las 5 reglas de oro para la consignación eléctrica:</p>
              <ul>
                <li>Desconectar la batería de 12V de servicio.</li>
                <li>Extraer el MSD (Service Disconnect Plug) de alta tensión.</li>
                <li>Esperar el tiempo de descarga de condensadores (mínimo 5 minutos).</li>
                <li>Verificar ausencia de tensión con multímetro de categoría CAT IV 1000V.</li>
                <li>Señalizar el área de trabajo de taller.</li>
              </ul>
            `,
            recursos: [
              {
                id: 'res_1_1',
                cursoId: 'TMVG0004',
                moduloId: 'mod1',
                titulo: 'Manual Oficial de Protocolos de Alta Tensión PDF',
                descripcion: 'Documento normativo homologado para talleres de automoción.',
                tipo: 'PDF',
                urlPrivada: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                tamano: '3.4 MB',
                permitirDescarga: true,
                publicado: true,
                creadoPor: 'Carlos Martínez López',
                fechaCreacion: '2026-03-01T10:00:00Z',
              },
            ],
          },
          {
            id: 'les_1_2',
            moduloId: 'mod1',
            titulo: '1.2 Procedimiento de corte de servicio MSD (Manual Service Disconnect)',
            descripcion: 'Pasos para el deslastrado del conector de servicio en baterías Li-Ion.',
            duracion: '30 min',
            orden: 2,
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            contenidoHtml: `
              <p>El conector de servicio interrumpe físicamente la serie de celdas en el centro del pack de baterías, dividiendo el voltaje de tracción a la mitad.</p>
            `,
            recursos: [],
          },
          {
            id: 'les_1_3',
            moduloId: 'mod1',
            titulo: '1.3 Verificación de ausencia de tensión en Inversor / Convertidor DC-DC',
            descripcion: 'Medición de voltaje residual entre las fases U, V, W y la masa del chasis.',
            duracion: '50 min',
            orden: 3,
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            contenidoHtml: `
              <p>Pruebas de aislamiento dieléctrico mediante megaóhmetro a 500V DC.</p>
            `,
            recursos: [
              {
                id: 'res_1_3',
                cursoId: 'TMVG0004',
                moduloId: 'mod1',
                titulo: 'Guía de Diagnóstico Inversor Toyota Prius PDF',
                descripcion: 'Esquema de conexiones y prueba de semiconductores IGBT.',
                tipo: 'PDF',
                urlPrivada: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                tamano: '5.1 MB',
                permitirDescarga: false,
                publicado: true,
                creadoPor: 'Carlos Martínez López',
                fechaCreacion: '2026-03-05T12:00:00Z',
              },
            ],
          },
        ],
      },
      {
        id: 'mod2',
        cursoId: 'TMVG0004',
        titulo: 'Módulo 2: Baterías de Tracción Litio-Ion y BMS',
        orden: 2,
        lecciones: [
          {
            id: 'les_2_1',
            moduloId: 'mod2',
            titulo: '2.1 Arquitectura del Battery Management System (BMS)',
            descripcion: 'Equilibrado de celdas, monitorización de temperatura y estado de salud (SoH).',
            duracion: '60 min',
            orden: 1,
            contenidoHtml: `
              <p>Análisis de tramas CAN Bus enviadas por el máster del BMS hacia la unidad del motor.</p>
            `,
            recursos: [],
          },
        ],
      },
    ],
  },
  {
    id: 'TMVG0209',
    codigo: 'TMVG0209',
    nombre: 'Mantenimiento del Sistema de Transmisión de Fuerza y Trenes de Rodaje',
    descripcion: 'Ajuste, sustitución y reparación de embragues, cajas de cambio manuales y automáticas y trenes de suspensión.',
    imagen:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=80',
    profesorNombre: 'Prof. Carlos Martínez López',
    profesorId: 'usr-teacher-1',
    modulos: [
      {
        id: 'mod209_1',
        cursoId: 'TMVG0209',
        titulo: 'Módulo 1: Sistemas de Transmisión Manual y Doble Embrague',
        orden: 1,
        lecciones: [
          {
            id: 'les_209_1',
            moduloId: 'mod209_1',
            titulo: '1.1 Verificación y purgado de mando hidráulico de embrague',
            descripcion: 'Procedimiento de purga de aire y sustitución de líquido DOT4.',
            duracion: '40 min',
            orden: 1,
            contenidoHtml: '<p>Verificación de holguras en el volante de inercia bimasa.</p>',
            recursos: [],
          },
        ],
      },
    ],
  },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enr-1',
    estudianteId: 'usr-student-1',
    cursoId: 'TMVG0004',
    fechaMatricula: '2026-02-01',
    estado: 'active',
    progresoCalculado: 42,
    ultimaLeccionId: 'les_1_3',
  },
  {
    id: 'enr-2',
    estudianteId: 'usr-student-1',
    cursoId: 'TMVG0209',
    fechaMatricula: '2026-03-01',
    estado: 'active',
    progresoCalculado: 15,
    ultimaLeccionId: 'les_209_1',
  },
];

export const MOCK_EMAIL_THREADS: any[] = [
  {
    id: 'th-1',
    external_thread_id: 'gmail-th-882194',
    subject: 'Información sobre curso de Mecánica de Automoción',
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
        recipient_email: 'info@academiaspendulo.es',
        subject: 'Información sobre curso de Mecánica de Automoción',
        body: 'Hola buenos días, estoy interesada en matricularme en el certificado TMVG0004 de vehículos híbridos. Quisiera saber si disponen de vacantes para el turno de mañana.',
        received_at: '2026-09-14T00:35:00Z',
        direction: 'inbound',
        read: false,
      },
    ],
  },
  {
    id: 'th-2',
    external_thread_id: 'gmail-th-993012',
    subject: 'RE: Solicitud de justificante de asistencia',
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
        recipient_email: 'secretaria@academiaspendulo.es',
        subject: 'Solicitud de justificante de asistencia',
        body: 'Estimada Secretaría, necesitaría el justificante de asistencia correspondiente a las clases del Módulo 1.',
        received_at: '2026-09-13T10:15:00Z',
        direction: 'inbound',
        read: true,
      },
      {
        id: 'msg-202',
        thread_id: 'th-2',
        external_message_id: 'gmail-msg-003',
        sender_name: 'Secretaría Academias Péndulo',
        sender_email: 'secretaria@academiaspendulo.es',
        recipient_email: 'alumno@pendulo.es',
        subject: 'RE: Solicitud de justificante de asistencia',
        body: 'Estimado Alejandro, adjuntamos en tu expediente de Secretaría Online el documento firmado digitalmente.',
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
    cursoNombre: 'Mantenimiento de Vehículos Híbridos y Eléctricos',
    moduloUnidad: 'Módulo 1 / Unidad 1.3',
    asunto: 'Duda sobre el tiempo de espera tras retirar el MSD',
    estado: 'RESPONDIDA',
    fechaCreacion: '2026-03-10T10:30:00Z',
    fechaUltimaActualizacion: '2026-03-10T11:15:00Z',
    mensajes: [
      {
        id: 'qmsg-1',
        autorId: 'usr-student-1',
        autorNombre: 'Alejandro García Pérez',
        autorRol: 'ALUMNO',
        texto: 'Hola Profesor, en la lección 1.3 se indica esperar 5 minutos tras quitar el conector MSD. ¿Es necesario medir con el comprobador antes de tocar la pletina del inversor aunque pasen 10 minutos?',
        fechaHora: '2026-03-10T10:30:00Z',
      },
      {
        id: 'qmsg-2',
        autorId: 'usr-teacher-1',
        autorNombre: 'Carlos Martínez López',
        autorRol: 'PROFESOR',
        texto: 'Hola Alejandro. Sí, rotundamente sí. La medición de tensión con un multímetro CAT IV 1000V es OBLIGATORIA por normativa de prevención de riesgos antes de realizar cualquier contacto físico, independientemente del tiempo transcurrido.',
        fechaHora: '2026-03-10T11:15:00Z',
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
    asunto: 'Certificado de horas lectivas realizadas en TMVG0004',
    descripcion: 'Requiero justificante oficial de asistencia y superación del Módulo 1 para la empresa.',
    estado: 'EN_TRAMITE',
    fechaCreacion: '2026-03-12T09:00:00Z',
    fechaUltimaActualizacion: '2026-03-12T14:20:00Z',
    mensajes: [
      {
        id: 'secmsg-1',
        autorId: 'usr-student-1',
        autorNombre: 'Alejandro García Pérez',
        autorRol: 'ALUMNO',
        texto: 'Adjunto solicitud firmada para la expedición de certificado intermedio.',
        fechaHora: '2026-03-12T09:00:00Z',
      },
      {
        id: 'secmsg-2',
        autorId: 'usr-admin-1',
        autorNombre: 'Elena Sánchez (Secretaría)',
        autorRol: 'ADMINISTRACION',
        texto: 'Solicitud recibida. Estamos procesando la firma digital de la certificación.',
        fechaHora: '2026-03-12T14:20:00Z',
      },
    ],
  },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    titulo: 'Convocatoria de Prácticas Presenciales en Taller Homologado',
    contenido:
      'Se informa a todos los alumnos matriculados en la especialidad TMVG0004 que las sesiones prácticas en taller de alta tensión se desarrollarán el próximo sábado en el módulo central de Almería.',
    autorNombre: 'Secretaría Académica',
    autorId: 'usr-admin-1',
    cursoId: 'TMVG0004',
    destinatarios: 'ALUMNOS',
    fecha: '2026-03-11T12:00:00Z',
  },
  {
    id: 'ann-2',
    titulo: 'Mantenimiento del Servidor del Campus Virtual',
    contenido:
      'El Campus estará en mantenimiento el domingo de 02:00 a 04:00 AM para la instalación de nuevas medidas de seguridad en el repositorio de temarios.',
    autorNombre: 'Administración Péndulo',
    autorId: 'usr-admin-1',
    destinatarios: 'TODOS',
    fecha: '2026-03-09T08:00:00Z',
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
    course_name: 'Mantenimiento de Vehículos Híbridos y Eléctricos',
    preferred_schedule: 'Mañanas (09:00 - 14:00)',
    employment_status: 'Empleado sector automoción',
    comments: 'Solicito información para bonificación FUNDAE por empresa.',
    message: 'Hola, me gustaría saber si la formación incluye prácticas con bancos de alta tensión.',
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
    course_name: 'Mantenimiento del Sistema de Transmisión de Fuerza y Trenes de Rodaje',
    preferred_schedule: 'Tardes (16:00 - 21:00)',
    employment_status: 'Desempleado',
    comments: 'Interesado en turno de tarde.',
    message: 'Quisiera saber las fechas de la próxima convocatoria presencial en Almería.',
    status: 'contacted',
    assigned_admin_name: 'Elena Sánchez',
    internal_notes: 'Llamado el 13/09. Interesado en financiación en 3 cuotas. Documentación enviada.',
    source: 'Modal Especialidad Formativa',
  },
  {
    id: 'req-003',
    created_at: '2026-09-10T11:00:00Z',
    first_name: 'Alejandro',
    last_name: 'García Pérez',
    email: 'alumno@pendulo.es',
    phone: '612 345 678',
    course_id: 'TMVG0004',
    course_code: 'TMVG0004',
    course_name: 'Mantenimiento de Vehículos Híbridos y Eléctricos',
    preferred_schedule: 'Mañanas',
    employment_status: 'Empleado',
    message: 'Solicitud previa de información comercial.',
    status: 'enrolled',
    student_id: 'usr-student-1',
    internal_notes: 'Alumno matriculado formalmente. Acceso activo al Campus Virtual.',
    source: 'Formulario Web Principal',
  },
];

