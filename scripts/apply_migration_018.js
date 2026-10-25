import pool, { query } from '../db.js';

// Official course images and SEO data derived strictly from authentic course data
const COURSE_SEO_SEED = {
  'fcos02': {
    slug: 'basico-prevencion-riesgos-laborales',
    meta_title: 'Curso Básico de Prevención de Riesgos Laborales (FCOS02) | Academias Péndulo',
    meta_description: 'Curso oficial Básico de Prevención de Riesgos Laborales (FCOS02) de 50 horas en modalidad presencial y teleformación. Válido según la Ley de PRL para talleres y empresas.',
    alt_text: 'Técnico preparando equipo de protección individual homologado en formación de seguridad laboral',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Mechanic_preparing_safety_gear_202609092333_n2ilac.jpg'
  },
  'tmvg0002': {
    slug: 'introduccion-a-la-automocion',
    meta_title: 'Curso de Introducción a la Automoción en Almería | Academias Péndulo',
    meta_description: 'Iníciate en la tecnología del automóvil en Almería con el curso oficial TMVG0002 de 40 horas en Academias Péndulo. Prácticas reales con herramientas y maquetas en taller.',
    alt_text: 'Estudiante aprendiendo componentes del automóvil y herramientas en el taller de automoción',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg0004': {
    slug: 'mantenimiento-vehiculos-hibridos',
    meta_title: 'Curso de Mantenimiento de Vehículos Híbridos en Almería | Academias Péndulo',
    meta_description: 'Especialízate en vehículos híbridos (HEV y PHEV) en Almería. Curso TMVG0004 de 60h sobre motores térmicos, motores eléctricos, inversores y baterías de alto voltaje.',
    alt_text: 'Mecánico realizando mantenimiento en motor y sistema de propulsión de vehículo híbrido',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989684/Technician_repairing_hybrid_vehi__202609092333_c8zabg.jpg'
  },
  'tmvg0008': {
    slug: 'diagnosis-averias-osciloscopio-avanzado',
    meta_title: 'Curso de Diagnosis de Averías con Osciloscopio en Almería | Academias Péndulo',
    meta_description: 'Curso avanzado TMVG0008 de diagnosis de averías en Almería. 60 horas prácticas con osciloscopio automotriz PicoScope y máquinas de diagnosis profesionales.',
    alt_text: 'Osciloscopio automotriz mostrando formas de onda de señales de sensores del motor en taller',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989685/Automotive_oscilloscope_showing___202609092333_xgm5xm.jpg'
  },
  'tmvg0021': {
    slug: 'preparacion-mantenimiento-electromecanica-vehiculos',
    meta_title: 'Curso de Preparación Básica en Electromecánica en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG0021 de 50 horas en Almería. Fundamentos técnicos de seguridad, metrología y preparación para el mantenimiento de vehículos automóviles.',
    alt_text: 'Herramientas de precisión y banco de trabajo en taller de electromecánica de vehículos',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0022': {
    slug: 'mecanica-de-automocion',
    meta_title: 'Curso de Mecánica de Automoción en Almería | Academias Péndulo',
    meta_description: 'Aprende mecánica de automoción profesional en Almería con el curso TMVG0022 de 80 horas. Motores térmicos, lubricación, refrigeración y sistemas auxiliares.',
    alt_text: 'Mecánico trabajando en el compartimento motor de un automóvil en elevador de taller',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg004po': {
    slug: 'diagnosis-de-vehiculos',
    meta_title: 'Curso de Diagnosis de Vehículos en Almería | Academias Péndulo',
    meta_description: 'Curso oficial TMVG004PO de 60 horas presenciales en Almería. Protocolos OBD-II, lectura de códigos DTC y localización metódica de averías electrónicas.',
    alt_text: 'Escáner de diagnosis automotriz conectado al puerto OBD de un vehículo en comprobación',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989685/Automotive_oscilloscope_showing___202609092333_xgm5xm.jpg'
  },
  'tmvg0063': {
    slug: 'mecanica-rapida-taller-multiservicio',
    meta_title: 'Curso de Mecánica Rápida y Taller Multiservicio en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG0063 de 50 horas en Almería. Procedimientos de servicio rápido: aceites, filtros, pastillas de freno y amortiguadores en taller multiservicio.',
    alt_text: 'Elevador de taller con vehículo en mantenimiento rápido de frenos y suspensión',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0064': {
    slug: 'mecanica-de-motocicletas-nivel-avanzado',
    meta_title: 'Curso de Mecánica de Motocicletas Nivel Avanzado en Almería | Academias Péndulo',
    meta_description: 'Especialízate en motos de media y gran cilindrada con el curso TMVG0064 de 80h en Almería. Reglaje de válvulas, inyección electrónica, ABS y suspensiones invertidas.',
    alt_text: 'Mecánico ajustando motor y transmisión en motocicleta de gran cilindrada en elevador',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0065': {
    slug: 'mantenimiento-basico-del-automovil',
    meta_title: 'Curso de Mantenimiento Básico del Automóvil en Almería | Academias Péndulo',
    meta_description: 'Curso práctico TMVG0065 de 40 horas en Almería. Comprobaciones de fluidos, batería, escobillas, luces y hábitos de conservación preventiva para conductores y auxiliares.',
    alt_text: 'Comprobación de niveles de fluidos y batería en el vano motor de un turismo',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg0066': {
    slug: 'elementos-tecnicos-basicos-automovil',
    meta_title: 'Curso de Elementos Técnicos Básicos del Automóvil en Almería | Academias Péndulo',
    meta_description: 'Aprende los principios físicos y componentes del coche moderno con el curso TMVG0066 de 45h en Almería. Chasis, tren de rodaje, dirección y transmisión.',
    alt_text: 'Maqueta explicativa de elementos de chasis, tren de rodaje y dirección automotriz',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0067': {
    slug: 'mecanica-de-motocicletas-nivel-inicial',
    meta_title: 'Curso de Mecánica de Motocicletas Nivel Inicial en Almería | Academias Péndulo',
    meta_description: 'Iníciate en la mecánica de motos y scooters con el curso TMVG0067 de 60 horas en Almería. Mantenimiento de kit de arrastre, frenos, bujías y carburación básica.',
    alt_text: 'Revisión y puesta a punto de frenos y cadena en motocicleta en taller de formación',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0068': {
    slug: 'puesta-a-punto-vehiculo-itv',
    meta_title: 'Curso de Puesta a Punto para la ITV en Almería | Academias Péndulo',
    meta_description: 'Aprende a preparar vehículos para la Inspección Técnica de Vehículos (ITV) en Almería. Curso TMVG0068 de 50h: gases, frenometría, alineación de luces y holguras.',
    alt_text: 'Alineador de faros y equipo de control de emisiones en línea de inspección de taller',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0069': {
    slug: 'mantenimiento-neumaticos-turismos-motocicletas',
    meta_title: 'Curso de Mantenimiento de Neumáticos en Almería | Academias Péndulo',
    meta_description: 'Curso práctico TMVG0069 de 40 horas en Almería. Desmontaje, montaje, equilibrado dinámico de ruedas, reparación de pinchazos y alineado de turismos y motos.',
    alt_text: 'Técnico operando desmontadora y equilibradora electrónica de neumáticos de automóvil',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0070': {
    slug: 'preparacion-motores-dos-tiempos',
    meta_title: 'Curso de Preparación de Motores de Dos Tiempos en Almería | Academias Péndulo',
    meta_description: 'Domina los motores 2T de ciclomotores y maquinaria agrícola en Almería. Curso TMVG0070 de 40 horas: lumbreras, carburación, mezclas y encendido.',
    alt_text: 'Despiece y ajuste de cilindro y pistón de motor de dos tiempos sobre banco de trabajo',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg0071': {
    slug: 'correas-de-distribucion',
    meta_title: 'Curso de Sustitución de Correas de Distribución en Almería | Academias Péndulo',
    meta_description: 'Aprende el calado exacto y sustitución de kits de distribución con bomba de agua en Almería. Curso TMVG0071 de 45 horas con útiles específicos de marca y tensores.',
    alt_text: 'Montaje de correa de distribución dentada y rodillos tensores con útiles de calado',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0072': {
    slug: 'sistemas-adas-vehiculos-industriales',
    meta_title: 'Curso de Sistemas ADAS en Vehículos Industriales en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG0072 de 60h en Almería enfocado en ADAS para camiones, autobuses y vehículos industriales. Calibración de radares y cámaras de asistencia.',
    alt_text: 'Panel de calibración y dianas para sistemas ADAS en vehículo pesado e industrial',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg007po': {
    slug: 'inyeccion-electronica',
    meta_title: 'Curso de Inyección Electrónica en Almería | Academias Péndulo',
    meta_description: 'Curso oficial TMVG007PO de 75 horas presenciales en Almería. Sistemas de inyección directa de gasolina (GDI/TSI) y diésel Common Rail, sondas y actuadores.',
    alt_text: 'Comprobación de rampa de inyección Common Rail y electroválvulas en motor diésel',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989685/Automotive_oscilloscope_showing___202609092333_xgm5xm.jpg'
  },
  'tmvg0109': {
    slug: 'operaciones-auxiliares-electromecanica-vehiculos',
    meta_title: 'Certificado Operaciones Auxiliares en Electromecánica en Almería | Academias Péndulo',
    meta_description: 'Certificado de Profesionalidad oficial TMVG0109 de 310 horas en Almería. Aprende mecánica básica, frenos, neumáticos y circuitos sin requisitos académicos previos.',
    alt_text: 'Alumnos realizando prácticas de operaciones auxiliares de taller mecánico en Almería',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg0110': {
    slug: 'planificacion-control-area-electromecanica',
    meta_title: 'Curso de Planificación y Control de Taller en Almería | Academias Péndulo',
    meta_description: 'Certificado de profesionalidad TMVG0110 de 420 horas en Almería. Gestión de taller de automoción, recepción de vehículos, presupuestos y control de tiempos.',
    alt_text: 'Recepción de taller de automoción con software de gestión y valoración técnica de averías',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg012po': {
    slug: 'mecanica-rapida-reparacion-automoviles',
    meta_title: 'Curso de Mecánica Rápida y Reparación de Automóviles en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG012PO de 90 horas en Almería. Diagnosis rápida visual y computarizada de los puntos críticos de seguridad y mantenimiento del vehículo.',
    alt_text: 'Mecánico inspeccionando elementos de seguridad activa en puesto de elevación de taller',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg0209': {
    slug: 'mantenimiento-sistemas-electricos-electronicos-vehiculos',
    meta_title: 'Certificado Sistemas Eléctricos y Electrónicos de Vehículos en Almería | Academias Péndulo',
    meta_description: 'Certificado de Profesionalidad oficial TMVG0209 de 520 horas en Almería. Diagnosis electrónica multimarca, redes multiplexadas CAN-Bus, alumbrado y confort.',
    alt_text: 'Comprobación de bus de datos CAN y circuito de confort electrónico del automóvil',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989685/Automotive_oscilloscope_showing___202609092333_xgm5xm.jpg'
  },
  'tmvg03': {
    slug: 'mantenimiento-basico-vehiculos-hibridos-electricos',
    meta_title: 'Curso de Mantenimiento Básico de Híbridos y Eléctricos en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG03 de 50 horas en Almería. Protocolos de seguridad eléctrica, consignación de alta tensión y mantenimiento preventivo en flotas electrificadas.',
    alt_text: 'Técnico con guantes aislantes de alta tensión verificando desconexión de servicio en vehículo eléctrico',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989684/Technician_repairing_hybrid_vehi__202609092333_c8zabg.jpg'
  },
  'tmvg0309': {
    slug: 'mantenimiento-sistemas-transmision-fuerza-trenes-rodaje',
    meta_title: 'Certificado Mantenimiento de Transmisión y Rodaje en Almería | Academias Péndulo',
    meta_description: 'Certificado oficial TMVG0309 de 480 horas en Almería. Cajas de cambio manuales y automáticas, embragues, diferenciales, suspensión, dirección y alineación 3D.',
    alt_text: 'Desmontaje y ajuste de caja de cambios y embrague en banco de taller de automoción',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg04': {
    slug: 'diagnosis-sistemas-anticontaminantes-gasolina',
    meta_title: 'Curso de Diagnosis de Sistemas Anticontaminación en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG04 de 50 horas en Almería. Catalizadores de 3 vías, sondas lambda de banda ancha, válvulas canister y control estequiométrico de gases.',
    alt_text: 'Analizador de gases de 4 gases y diagnosis de sonda lambda en vehículo de gasolina',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989685/Automotive_oscilloscope_showing___202609092333_xgm5xm.jpg'
  },
  'tmvg0409': {
    slug: 'mantenimiento-del-motor-sistemas-auxiliares',
    meta_title: 'Certificado Mantenimiento del Motor y Sistemas Auxiliares en Almería | Academias Péndulo',
    meta_description: 'Certificado de Profesionalidad oficial TMVG0409 de 520 horas en Almería. Reparación integral del motor térmico, turbocompresores, lubricación y distribución.',
    alt_text: 'Ajuste de culata, válvulas y cigüeñal de motor térmico en banco de trabajo de taller',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg05': {
    slug: 'comprobacion-diagnosis-vehiculo-electrico',
    meta_title: 'Curso de Comprobación y Diagnosis del Vehículo Eléctrico en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG05 de 70 horas en Almería. Diagnosis avanzada con osciloscopio en inversores de tracción, convertidores DC-DC y sistemas de gestión de batería (BMS).',
    alt_text: 'Medición de aislamiento y señal PWM en inversor de tracción de vehículo 100% eléctrico',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989684/Technician_repairing_hybrid_vehi__202609092333_c8zabg.jpg'
  },
  'tmvg06': {
    slug: 'estructura-funcionamiento-vehiculo-electrico',
    meta_title: 'Curso de Estructura del Vehículo Eléctrico en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG06 de 40 horas en Almería. Arquitectura interna de vehículos BEV: motores síncronos de imanes permanentes, celdas de litio y puntos de recarga.',
    alt_text: 'Maqueta didáctica de arquitectura y cadena de tracción de coche eléctrico con batería seccionada',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989684/Technician_repairing_hybrid_vehi__202609092333_c8zabg.jpg'
  },
  'tmvg07': {
    slug: 'electrificacion-vehiculos-hibridos-electricos',
    meta_title: 'Curso de Electrificación de Vehículos en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG07 de 80 horas en Almería. Conversión eléctrica (retrofit), integración de baterías de tracción, BMS y homologaciones técnicas.',
    alt_text: 'Instalación y conexionado de cableado de alta potencia naranja en vehículo en conversión',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989684/Technician_repairing_hybrid_vehi__202609092333_c8zabg.jpg'
  },
  'tmvg08': {
    slug: 'sistemas-avanzados-asistencia-conduccion-adas',
    meta_title: 'Curso de Calibración de Sistemas ADAS en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG08 de 50 horas en Almería. Calibración estática y dinámica de cámaras de parabrisas, radares anticolisión, sensor de ángulo muerto y asistente de carril.',
    alt_text: 'Equipo de calibración láser y paneles diana para cámaras ADAS en taller especializado',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg12': {
    slug: 'mantenimiento-bicicletas-vehiculos-movilidad-personal',
    meta_title: 'Curso de Reparación de VMP y Bicicletas Eléctricas en Almería | Academias Péndulo',
    meta_description: 'Curso presencial TMVG12 de 80 horas en Almería. Mantenimiento y reparación de patinetes eléctricos (VMP), bicicletas eléctricas, baterías y controladoras electrónicas.',
    alt_text: 'Técnico reparando motor eléctrico y sistema de frenos en patinete eléctrico de movilidad urbana',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  },
  'tmvg13': {
    slug: 'diagnosis-averias-grupo-motor',
    meta_title: 'Curso de Diagnosis de Averías del Grupo Motor en Almería | Academias Péndulo',
    meta_description: 'Curso práctico TMVG13 de 65 horas en Almería. Localización de ruidos mecánicos, falta de compresión, fugas de lubricación, presión de aceite y fallos de encendido.',
    alt_text: 'Comprobador de compresión y endoscopio de cilindros inspeccionando motor térmico',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg'
  },
  'tmvg14': {
    slug: 'electromecanica-de-vehiculos',
    meta_title: 'Curso de Electromecánica de Vehículos en Almería | Academias Péndulo',
    meta_description: 'Formación completa presencial TMVG14 de 200 horas en Almería. Mantenimiento integral de motor, transmisión, sistemas eléctricos, multiplexado y diagnosis del automóvil.',
    alt_text: 'Taller de formación en electromecánica con elevadores, maquetas y vehículos de práctica en Almería',
    og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
  }
};

async function run() {
  console.log('🚀 Starting Migration 018: SEO and Slugs for Academias Péndulo...');

  // 1. Alter table
  const columnsToAdd = [
    { name: 'slug', def: 'VARCHAR(150) DEFAULT NULL' },
    { name: 'meta_title', def: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'meta_description', def: 'TEXT DEFAULT NULL' },
    { name: 'alt_text', def: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'og_image', def: 'VARCHAR(500) DEFAULT NULL' },
    { name: 'indexable', def: 'TINYINT(1) NOT NULL DEFAULT 1' }
  ];

  for (const col of columnsToAdd) {
    try {
      await query(`ALTER TABLE especialidades ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✓ Column ${col.name} added.`);
    } catch (err) {
      if (err.message.includes('Duplicate column name')) {
        console.log(`  - Column ${col.name} already exists.`);
      } else {
        console.error(`  ✕ Error adding column ${col.name}:`, err.message);
      }
    }
  }

  // 2. Add unique index on slug
  try {
    await query(`CREATE UNIQUE INDEX idx_especialidades_slug ON especialidades (slug)`);
    console.log('  ✓ Unique index on slug created.');
  } catch (err) {
    if (err.message.includes('Duplicate key name') || err.message.includes('already exists')) {
      console.log('  - Index on slug already exists.');
    } else {
      console.warn('  ! Note on slug index:', err.message);
    }
  }

  // 3. Seed SEO fields for all 33 courses
  console.log('🌱 Seeding SEO fields and unique slugs for all courses...');
  let updatedCount = 0;

  for (const [courseId, seo] of Object.entries(COURSE_SEO_SEED)) {
    await query(`
      UPDATE especialidades
      SET
        slug = ?,
        meta_title = ?,
        meta_description = ?,
        alt_text = ?,
        og_image = ?,
        indexable = 1
      WHERE id = ?
    `, [
      seo.slug,
      seo.meta_title,
      seo.meta_description,
      seo.alt_text,
      seo.og_image,
      courseId
    ]);
    updatedCount++;
    console.log(`  ✓ [${courseId}] -> /cursos/${seo.slug}`);
  }

  // 4. Record migration in migraciones
  try {
    await query(`
      INSERT INTO migraciones (version, nombre, ejecutado_en)
      VALUES ('018', '018_seo_and_slugs.sql', NOW())
      ON DUPLICATE KEY UPDATE ejecutado_en = NOW()
    `);
    console.log('  ✓ Migration 018 recorded in migraciones table.');
  } catch (err) {
    console.warn('  ! Migration record warning:', err.message);
  }

  console.log(`\n🎉 Migration 018 completed successfully! Updated ${updatedCount} courses with permanent slugs and dynamic metadata.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error in migration 018:', err);
  process.exit(1);
});
